import { log } from "@therockstorm/utils"
import Lambda, { EnvironmentVariables } from "aws-sdk/clients/lambda"
import SQS from "aws-sdk/clients/sqs"
import pLimit from "p-limit"
import { Concurrency, ConsumerId, Func, IUpdateEvent } from ".."
import { lambdaName, queueName } from "../mapper"
import { calculateFuncTimeout, logRes, validateConcurrency } from "../util"

const lam = new Lambda()
const sqs = new SQS()
const limit = pLimit(15)

export const update = async (evt: IUpdateEvent): Promise<Func[]> => {
  const con = validateConcurrency(evt.concurrency)
  const to = calculateFuncTimeout(con.post)
  const res = await Promise.all(
    evt.consumerIds.map(id => limit<any, Func>(() => upd(id, con, to)))
  )
  log("Complete")
  return res
}

const upd = async (id: ConsumerId, con: Concurrency, to: number) =>
  await logRes(`Updating ${id}`, async () => {
    const ln = lambdaName(id)
    const [vs, qRes] = await Promise.all([
      getEnvVars(ln),
      sqs.getQueueUrl({ QueueName: queueName(id) }).promise(),
      lam
        .putFunctionConcurrency({
          FunctionName: ln,
          ReservedConcurrentExecutions: con.reserved
        })
        .promise()
    ])
    const [lRes] = await Promise.all([
      lam
        .updateFunctionConfiguration({
          Environment: {
            Variables: { ...vs, CONCURRENCY: con.post.toString() }
          },
          FunctionName: ln,
          Timeout: to
        })
        .promise(),
      sqs
        .setQueueAttributes({
          Attributes: { VisibilityTimeout: (to * 6).toString() },
          QueueUrl: qRes.QueueUrl || ""
        })
        .promise()
    ])
    return { arn: lRes.FunctionArn as string }
  })

const getEnvVars = async (ln: string): Promise<EnvironmentVariables> => {
  const env = (await lam
    .getFunctionConfiguration({ FunctionName: ln })
    .promise()).Environment
  return env && env.Variables ? env.Variables : {}
}
