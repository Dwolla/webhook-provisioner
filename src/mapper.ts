import { ConsumerId, Res } from "."
import { ENV, PROJECT, REGION } from "./util"

export const toRes = (body: object, statusCode: number = 200): Res => ({
  body: JSON.stringify(body),
  statusCode
})

export const lambdaName = (cId: ConsumerId) => resourceName("lambda", cId)

export const lambdaErrorAlarmName = (cId: ConsumerId) =>
  resourceName("lambda-error", cId)

export const logErrorAlarmName = (cId: ConsumerId) =>
  resourceName("lambda-log-error", cId)

export const filterName = (cId: ConsumerId) => resourceName("filter", cId)

export const metricName = (cId: ConsumerId) =>
  resourceName("lambda-log-error", cId)

export const logGroupName = (cId: ConsumerId) =>
  `/aws/lambda/${lambdaName(cId)}`

export const policyName = (cId: ConsumerId) => resourceName("policy", cId, true)

export const queueName = (cId: ConsumerId) =>
  resourceName("consumer-queue", cId)

export const queueDepthAlarmName = (cId: ConsumerId) =>
  resourceName("queue-depth", cId)

export const errorQueueName = () => resourceName("error-queue")

export const resultQueueName = () => resourceName("result-queue")

export const roleName = (cId: ConsumerId) => resourceName("role", cId, true)

export const topicName = () => `cloudwatch-alarm-to-slack-topic-${ENV}`

const resourceName = (
  resource: string,
  resourceId?: ConsumerId,
  includeRegion: boolean = false
): string =>
  `${PROJECT}${
    typeof resourceId === "undefined" ? "" : `-${resourceId}`
  }-${resource}${includeRegion ? `-${REGION}` : ""}-${ENV}`
