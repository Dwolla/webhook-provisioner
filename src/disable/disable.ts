import Lambda from "aws-sdk/clients/lambda"
import SQS, { GetQueueUrlResult } from "aws-sdk/clients/sqs"
import { ConsumerId, IDisableEvent } from ".."
import { update } from "../eventSources"
import { queueName } from "../mapper"
import { ignore404 } from "../util"
import { log, warn } from "../logger"

const lam = new Lambda()
const sqs = new SQS()

export const disable = async (evt: IDisableEvent): Promise<void> => {
  const cId = evt.consumerId
  await update(lam, cId, false)
  if (evt.purgeQueue) await purge(cId)

  log("Complete")
}

const purge = async (cId: ConsumerId) => {
  const qName = queueName(cId)
  const qr = await ignore404<GetQueueUrlResult>(() =>
    sqs.getQueueUrl({ QueueName: qName }).promise()
  )

  if (qr) {
    try {
      log(`Purging queue ${qName}`)
      await sqs.purgeQueue({ QueueUrl: qr.QueueUrl as string }).promise()
    } catch (e: any) {
      if (e.code && e.code === "AWS.SimpleQueueService.PurgeQueueInProgress") {
        warn(e.message)
        return
      }
      throw new Error(e)
    }
  }
}
