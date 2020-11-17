import CloudWatch from "aws-sdk/clients/cloudwatch"
import SNS from "aws-sdk/clients/sns"
import { ConsumerId } from ".."
import { topicName } from "../mapper"
import { logRes } from "../util"
import {
  toLambdaErrorAlarm,
  toLogErrorAlarm,
  toQueueDepthAlarm,
} from "./mapper"

const cw = new CloudWatch()
const sns = new SNS()

export const createAlarms = async (cId: ConsumerId): Promise<void> =>
  await logRes<void>("Creating alarms", async () => {
    // Already exists, only way to get the ARN ¯\_(ツ)_/¯
    const topicArn = (await sns.createTopic({ Name: topicName() }).promise())
      .TopicArn as string
    await Promise.all([
      cw.putMetricAlarm(toQueueDepthAlarm(cId, topicArn)).promise(),
      cw.putMetricAlarm(toLambdaErrorAlarm(cId, topicArn)).promise(),
      cw.putMetricAlarm(toLogErrorAlarm(cId, topicArn)).promise(),
    ])
  })
