import {
  filterName,
  lambdaErrorAlarmName,
  lambdaName,
  logErrorAlarmName,
  logGroupName,
  metricName,
  policyName,
  queueDepthAlarmName,
  queueName,
  resultQueueName,
  roleName,
  s3ToLocation,
  topicName,
} from "../src/mapper"

const CID = 123

test("lambdaName", () =>
  expect(lambdaName(CID)).toBe(`webhooks-${CID}-lambda-test`))

test("consumerId of 0", () =>
  expect(lambdaName(0)).toBe(`webhooks-0-lambda-test`))

test("lambdaErrorAlarmName", () =>
  expect(lambdaErrorAlarmName(CID)).toBe(`webhooks-${CID}-lambda-error-test`))

test("logErrorAlarmName", () =>
  expect(logErrorAlarmName(CID)).toBe(`webhooks-${CID}-lambda-log-error-test`))

test("filterName", () =>
  expect(filterName(CID)).toBe(`webhooks-${CID}-filter-test`))

test("metricName", () =>
  expect(metricName(CID)).toBe(`webhooks-${CID}-lambda-log-error-test`))

test("logGroupName", () =>
  expect(logGroupName(CID)).toBe(`/aws/lambda/webhooks-${CID}-lambda-test`))

test("policyName", () =>
  expect(policyName(CID)).toBe(`webhooks-${CID}-policy-us-west-2-test`))

test("queueName", () =>
  expect(queueName(CID)).toBe(`webhooks-${CID}-consumer-queue-test`))

test("queueDepthAlarmName", () =>
  expect(queueDepthAlarmName(CID)).toBe(`webhooks-${CID}-queue-depth-test`))

test("resultQueueName", () =>
  expect(resultQueueName()).toBe(`webhooks-result-queue-test`))

test("roleName", () =>
  expect(roleName(CID)).toBe(`webhooks-${CID}-role-us-west-2-test`))

test("topicName", () =>
  expect(topicName()).toBe(`cloudwatch-alarm-to-slack-topic-test`))

describe("s3ToLocation", () => {
  test("should s3 bucket and key to a Location", () => {
    const bucket = "bucket"
    const version = "2024-09-01T16:41:33.184Z"
    const key = `serverless/webhook-handler/test/1549039293184-${version}/func.zip`

    expect(s3ToLocation(bucket, key)).toStrictEqual({
      bucket,
      key,
      version,
    })
  })
})
