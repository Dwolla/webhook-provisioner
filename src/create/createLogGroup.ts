import CloudWatchLogs from "aws-sdk/clients/cloudwatchlogs"
import { ConsumerId, LogGroup } from ".."
import { logRes } from "../util"
import {
  toCreateLogGroup,
  toDescribeLogGroups,
  toPutMetricFilter,
  toPutRetentionPolicy,
} from "./mapper"

const cwl = new CloudWatchLogs()

export const createLogGroup = async (cId: ConsumerId): Promise<LogGroup> =>
  await logRes<LogGroup>("Creating log group", async () => {
    await cwl.createLogGroup(toCreateLogGroup(cId)).promise()
    await cwl.putRetentionPolicy(toPutRetentionPolicy(cId)).promise()
    const [res] = await Promise.all([
      cwl.describeLogGroups(toDescribeLogGroups(cId)).promise(),
      createMetricFilter(cId),
    ])
    const lg = res.logGroups
    return { arn: lg && lg[0] && lg[0].arn ? lg[0].arn : "" }
  })

const createMetricFilter = async (cId: ConsumerId): Promise<void> =>
  await logRes<void>("Creating metric filter", async () => {
    await cwl.putMetricFilter(toPutMetricFilter(cId)).promise()
  })
