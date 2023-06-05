import CloudWatch from "aws-sdk/clients/cloudwatch"
import CloudWatchLogs from "aws-sdk/clients/cloudwatchlogs"
import IAM from "aws-sdk/clients/iam"
import Lambda from "aws-sdk/clients/lambda"
import SQS, { GetQueueUrlResult } from "aws-sdk/clients/sqs"
import { ConsumerId } from ".."
import { exec } from "../eventSources"
import {
  filterName,
  lambdaErrorAlarmName,
  lambdaName,
  logErrorAlarmName,
  logGroupName,
  queueDepthAlarmName,
  queueName,
  roleName,
} from "../mapper"
import { ignore404 } from "../util"
import { log } from "../logger"

const cw = new CloudWatch()
const cwl = new CloudWatchLogs()
const iam = new IAM()
const lam = new Lambda()
const sqs = new SQS()

export const del = async (cId: ConsumerId): Promise<void> => {
  const lgName = logGroupName(cId)
  const fName = filterName(cId)
  log(`Deleting metric filter ${fName} from ${lgName}`)
  await ignore404(() =>
    cwl
      .deleteMetricFilter({
        filterName: fName,
        logGroupName: lgName,
      })
      .promise()
  )

  log(`Deleting log group ${lgName}`)
  await ignore404(() => cwl.deleteLogGroup({ logGroupName: lgName }).promise())

  const aNames = [
    queueDepthAlarmName(cId),
    lambdaErrorAlarmName(cId),
    logErrorAlarmName(cId),
  ]
  log(`Deleting alarms ${aNames.join(", ")}`)
  await ignore404(() => cw.deleteAlarms({ AlarmNames: aNames }).promise())

  await exec(lam, cId, async (uuid: string, state?: string) =>
    state && state === "Deleting"
      ? (state as string)
      : await lam.deleteEventSourceMapping({ UUID: uuid }).promise()
  )

  const lName = lambdaName(cId)
  log(`Deleting lambda ${lName}`)
  await ignore404(() => lam.deleteFunction({ FunctionName: lName }).promise())

  const qName = queueName(cId)
  log(`Deleting queue ${qName}`)
  const qr = await ignore404<GetQueueUrlResult>(() =>
    sqs.getQueueUrl({ QueueName: qName }).promise()
  )
  if (qr) await sqs.deleteQueue({ QueueUrl: qr.QueueUrl as string }).promise()

  await ignore404(async () => {
    const rn = roleName(cId)
    const rr = await iam.getRole({ RoleName: rn }).promise()
    const pa = rr.Role.Arn.replace(/role/g, "policy")
    log(`Detaching ${rn} from ${pa}`)
    await ignore404(() =>
      iam.detachRolePolicy({ RoleName: rn, PolicyArn: pa }).promise()
    )
    log(`Deleting ${pa}`)
    await ignore404(() => iam.deletePolicy({ PolicyArn: pa }).promise())
    log(`Deleting ${rn}`)
    await ignore404(() => iam.deleteRole({ RoleName: rn }).promise())
  })
  log("Complete")
}
