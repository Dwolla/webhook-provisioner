import { log } from "@therockstorm/utils"
import Lambda, {
  EnvironmentResponse as ER,
  EnvironmentVariables as EV,
  FunctionList,
} from "aws-sdk/clients/lambda"
import pLimit from "p-limit"
import { IFunc, Location } from ".."
import { latestCode } from "../latestCode"
import { calculateFuncTimeout, ENV, logRes } from "../util"

const lam = new Lambda()
const limit = pLimit(15)
const re = new RegExp(`^webhooks-\\d+-lambda-${ENV}$`)
type Fn = Readonly<{ name: string; vars: EV }>
type Partition<T> = [T[], T[]]

export const updateAll = async (): Promise<IFunc[]> => {
  const [lc, fns] = await Promise.all([latestCode(), allFuncs()])
  const [upd, notUpd] = partition(
    fns,
    (f) => toEpoch(f.vars.VERSION) < toEpoch(lc.version)
  )
  if (notUpd.length) {
    log(`Not updating ${notUpd.map((f) => f.name).join(", ")}`)
  }

  const res = await Promise.all(
    upd.map((f) => limit<any, IFunc>(() => update(f, lc)))
  )
  log("Complete")
  return res
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
