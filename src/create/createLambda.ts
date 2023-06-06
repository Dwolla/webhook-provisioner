import { log } from "../logger"
import Lambda from "aws-sdk/clients/lambda"
import { CreateFuncReq, IFunc } from ".."
import { logRes, retry } from "../util"
import {
  toCreateEventSourceMapping,
  toCreateFunc,
  toPutFuncConcurrency,
} from "./mapper"

const lam = new Lambda()

export const createLambda = async (req: CreateFuncReq): Promise<IFunc> =>
  await logRes<IFunc>("Creating lambda", async () => {
    const r = await retry(async () =>
      lam.createFunction(toCreateFunc(req)).promise()
    )

    log("Setting reserved concurrency")
    await lam
      .putFunctionConcurrency(
        toPutFuncConcurrency(req.cId, req.concurrency.reserved)
      )
      .promise()

    log("Creating event source")
    const esm = await retry(async () =>
      lam
        .createEventSourceMapping(
          toCreateEventSourceMapping(req.cId, req.queues.partner.arn)
        )
        .promise()
    )
    return { arn: r.FunctionArn as string, eventSourceId: esm.UUID || "" }
  })
