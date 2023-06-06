import { log } from "../logger"
import SQS from "aws-sdk/clients/sqs"
import { ConsumerId, Queues } from ".."
import { errorQueueName, resultQueueName } from "../mapper"
import { logRes } from "../util"
import { toCreateQueue, toGetQueueAttributes, toTagQueue } from "./mapper"

const sqs = new SQS()

export const createQueue = async (
  cId: ConsumerId,
  funcTimeout: number
): Promise<Queues> =>
  await logRes<Queues>("Creating queue", async () => {
    const [rr, er] = await Promise.all([
      sqs.getQueueUrl({ QueueName: resultQueueName() }).promise(),
      sqs.getQueueUrl({ QueueName: errorQueueName() }).promise(),
    ])
    const rUrl = rr.QueueUrl as string
    const eUrl = er.QueueUrl as string
    const [ra, ea] = await Promise.all([getQueueArn(rUrl), getQueueArn(eUrl)])
    const pUrl = (
      await sqs.createQueue(toCreateQueue(cId, ea, funcTimeout)).promise()
    ).QueueUrl as string

    log("Tagging queue and getting attributes", pUrl)
    const [pArn] = await Promise.all([
      getQueueArn(pUrl),
      sqs.tagQueue(toTagQueue(cId, pUrl)).promise(),
    ])
    return {
      error: { url: eUrl, arn: ea },
      partner: { url: pUrl, arn: pArn },
      result: { url: rUrl, arn: ra },
    }
  })

const getQueueArn = async (url: string) => {
  const attrs = (
    await sqs.getQueueAttributes(toGetQueueAttributes(url)).promise()
  ).Attributes
  return attrs && attrs.QueueArn ? attrs.QueueArn : ""
}
