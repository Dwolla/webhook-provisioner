import Lambda, {
  EnvironmentResponse as ER,
  EnvironmentVariables as EV,
  FunctionList,
} from "aws-sdk/clients/lambda"
import pThrottle from "p-throttle"
import {
  ConsumerId,
  IFunc,
  Location,
  UpdateConsumersCodeRequest,
  UpdateConsumersCodeResponse,
} from ".."
import { codeExists, latestCode } from "../latestCode"
import { calculateFuncTimeout, ENV, logRes } from "../util"
import { error, log } from "../logger"
import { lambdaName } from "../mapper"
import { getLambdaEnvVars } from "../lambdaHelpers"

const lambdaClient = new Lambda()
const throttle = pThrottle({
  limit: 10,
  interval: 2500,
})

const webhookPattern = new RegExp(`^webhooks-(\\d+|app\\d+)-lambda-${ENV}$`)

type Fn = Readonly<{ name: string; vars: EV }>
type Partition<T> = [T[], T[]]
const FULFILLED = "fulfilled"
const REJECTED = "rejected"

const throttled = throttle(
  async (func: Fn, code: Location, runtime?: string) =>
    await update(func, code, runtime)
)

export const updateAll = async (): Promise<IFunc[]> => {
  const [lc, fns] = await Promise.all([latestCode(), allFunctions()])
  const [upd, notUpd] = partition(
    fns,
    (f) => toEpoch(f.vars.VERSION) < toEpoch(lc.version)
  )
  logFunctionsNotUpdates(notUpd)

  const results = await Promise.allSettled(
    upd.map(async (f) => await throttled(f, lc))
  )
  logResults(results)

  log("Update all completed")
  return results
    .filter((r) => r.status === FULFILLED)
    .map((r) => (r as PromiseFulfilledResult<IFunc>).value)
}

export const updateByConsumerIds = async (
  request: UpdateConsumersCodeRequest
): Promise<UpdateConsumersCodeResponse> => {
  const codeVersion = await codeExists(request.codeName)
  const lambdas = await Promise.all(request.consumerIds.map(getLambdaDetails))

  const [updateLambdas, upToDateLambdas] = partition(
    lambdas,
    (f) => toEpoch(f.vars.VERSION) != toEpoch(codeVersion.version)
  )

  logFunctionsNotUpdates(upToDateLambdas)

  const results = await Promise.allSettled(
    updateLambdas.map(
      async (f) => await throttled(f, codeVersion, request.nodeVersion)
    )
  )
  logResults(results)

  log("Completed webhook handler updates")
  return Promise.resolve({
    statusCode: 200,
    body: {
      message: "Completed, verify logs for individual handler updates",
    },
  })
}

const getLambdaDetails = async (consumerId: ConsumerId): Promise<Fn> => {
  const name = lambdaName(consumerId)
  const lambdaEnvVars = await getLambdaEnvVars(name)

  return {
    name: name,
    vars: lambdaEnvVars,
  }
}

const allFunctions = async (): Promise<Fn[]> => {
  let all: Fn[] = []
  const allFunctionsRec = async (nm?: string): Promise<Fn[]> => {
    const res = await lambdaClient.listFunctions({ Marker: nm }).promise()
    if (res.Functions) all = all.concat(toFns(res.Functions))
    return res.NextMarker ? allFunctionsRec(res.NextMarker) : all
  }

  const toFns = (fns: FunctionList) =>
    fns
      .filter(
        (f) =>
          f.FunctionName &&
          webhookPattern.test(f.FunctionName) &&
          f.Environment &&
          f.Environment.Variables
      )
      .map((f) => ({
        name: f.FunctionName as string,
        vars: (f.Environment as ER).Variables as EV,
      }))

  return allFunctionsRec()
}

const toEpoch = (s: string): number => new Date(s).getTime()

function partition<T>(as: T[], pred: (a: T) => boolean) {
  return as.reduce(
    ([x, y], a): Partition<T> => (pred(a) ? [[...x, a], y] : [x, [...y, a]]),
    [[], []] as Partition<T>
  )
}

const update = async (
  f: Fn,
  lc: Location,
  runtime = "nodejs20.x"
): Promise<IFunc> =>
  await logRes(`Updating ${f.name}`, async () => {
    await lambdaClient
      .updateFunctionCode({
        FunctionName: f.name,
        Publish: true,
        S3Bucket: lc.bucket,
        S3Key: lc.key,
      })
      .promise()
    log(`updateFunctionCode complete for ${f.name}`)
    await lambdaClient
      .waitFor("functionUpdatedV2", { FunctionName: f.name })
      .promise()
    const arn = (
      await lambdaClient
        .updateFunctionConfiguration({
          Environment: { Variables: { ...f.vars, VERSION: lc.version } },
          FunctionName: f.name,
          MemorySize: 128,
          Runtime: runtime,
          Timeout: calculateFuncTimeout(f.vars.CONCURRENCY),
        })
        .promise()
    ).FunctionArn as string
    return { arn, name: f.name }
  })

const logResults = (results: PromiseSettledResult<IFunc>[]) => {
  results.forEach((res, i) => {
    if (res.status === REJECTED) {
      const reason = (res as PromiseRejectedResult).reason
      error(`Update failed for ${i}. Reason: ${reason}`)
    }

    if (res.status === FULFILLED) {
      log(
        `Update successful for lambdaName=${
          (res as PromiseFulfilledResult<IFunc>).value.name
        }`
      )
    }
  })
}

const logFunctionsNotUpdates = (notUpdating: Fn[]) =>
  notUpdating.forEach((lambda) =>
    log(
      `Lambda running the current version. No updates required name=${lambda.name}`
    )
  )
