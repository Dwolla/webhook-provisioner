import { log } from "@therockstorm/utils"
import Lambda, {
  EnvironmentResponse as ER,
  EnvironmentVariables as EV,
  FunctionList,
} from "aws-sdk/clients/lambda"
import pThrottle from "p-throttle"
import { IFunc, Location } from ".."
import { latestCode } from "../latestCode"
import { calculateFuncTimeout, ENV, logRes } from "../util"

const lam = new Lambda()
const throttle = pThrottle({
  limit: 10,
  interval: 2500,
})
const re = new RegExp(`^webhooks-\\d+-lambda-${ENV}$`)
type Fn = Readonly<{ name: string; vars: EV }>
type Partition<T> = [T[], T[]]
const FULFILLED = "fulfilled"
const REJECTED = "rejected"

export const updateAll = async (): Promise<IFunc[]> => {
  const [lc, fns] = await Promise.all([latestCode(), allFuncs()])
  const [upd, notUpd] = partition(
    fns,
    (f) => toEpoch(f.vars.VERSION) < toEpoch(lc.version)
  )
  if (notUpd.length) {
    log(`Not updating ${notUpd.map((f) => f.name).join(", ")}`)
  }

  const throttled = throttle(async (func: Fn) => {
    return await update(func, lc)
  })

  const results = await Promise.allSettled(
    upd.map(async (f) => await throttled(f))
  )

  results.forEach((res, i) => {
    if (res.status === REJECTED) {
      const reason = (res as PromiseRejectedResult).reason
      log(`Update failed for ${upd[i].name}. Reason: ${reason}`)
    }
  })

  log("Complete")
  return results
    .filter((r) => r.status === FULFILLED)
    .map((r) => (r as PromiseFulfilledResult<IFunc>).value)
}

const allFuncs = async (): Promise<Fn[]> => {
  let all: Fn[] = []
  const allFuncsRec = async (nm?: string): Promise<Fn[]> => {
    const res = await lam.listFunctions({ Marker: nm }).promise()
    if (res.Functions) all = all.concat(toFns(res.Functions))
    return res.NextMarker ? allFuncsRec(res.NextMarker) : all
  }

  const toFns = (fns: FunctionList) =>
    fns
      .filter(
        (f) =>
          f.FunctionName &&
          re.test(f.FunctionName) &&
          f.Environment &&
          f.Environment.Variables
      )
      .map((f) => ({
        name: f.FunctionName as string,
        vars: (f.Environment as ER).Variables as EV,
      }))

  return allFuncsRec()
}

const toEpoch = (s: string): number => new Date(s).getTime()

function partition<T>(as: T[], pred: (a: T) => boolean) {
  return as.reduce(
    ([x, y], a): Partition<T> => (pred(a) ? [[...x, a], y] : [x, [...y, a]]),
    [[], []] as Partition<T>
  )
}

const update = async (f: Fn, lc: Location): Promise<IFunc> =>
  await logRes(`Updating ${f.name}`, async () => {
    await lam
      .updateFunctionCode({
        FunctionName: f.name,
        Publish: true,
        S3Bucket: lc.bucket,
        S3Key: lc.key,
      })
      .promise()
    log(`updateFunctionCode complete for ${f.name}`)
    await lam.waitFor("functionUpdatedV2", { FunctionName: f.name }).promise()
    const arn = (
      await lam
        .updateFunctionConfiguration({
          Environment: { Variables: { ...f.vars, VERSION: lc.version } },
          FunctionName: f.name,
          MemorySize: 128,
          Runtime: "nodejs12.x",
          Timeout: calculateFuncTimeout(f.vars.CONCURRENCY),
        })
        .promise()
    ).FunctionArn as string
    return { arn }
  })
