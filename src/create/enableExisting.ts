import Lambda from "aws-sdk/clients/lambda"
import SQS, { GetQueueUrlResult } from "aws-sdk/clients/sqs"
import { ConsumerId } from ".."
import { update } from "../eventSources"
import { queueName } from "../mapper"
import { ignore404 } from "../util"

const lam = new Lambda()
const sqs = new SQS()

export const enableExisting = async (
  cId: ConsumerId
): Promise<string | undefined> => {
  if (await update(lam, cId, true)) {
    const qr = await ignore404<GetQueueUrlResult>(() =>
      sqs.getQueueUrl({ QueueName: queueName(cId) }).promise()
    )
    return qr && qr.QueueUrl
  }
  return
}
