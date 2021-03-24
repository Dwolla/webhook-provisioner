import * as mapper from "../../src/mapper"

jest.mock("../../src/mapper")
const lambdaName = mapper.lambdaName as jest.Mock
const logGroupName = mapper.logGroupName as jest.Mock
const filterName = mapper.filterName as jest.Mock
const metricName = mapper.metricName as jest.Mock
const lambdaErrorAlarmName = mapper.lambdaErrorAlarmName as jest.Mock
const logErrorAlarmName = mapper.logErrorAlarmName as jest.Mock
const policyName = mapper.policyName as jest.Mock
const queueName = mapper.queueName as jest.Mock
const queueDepthAlarmName = mapper.queueDepthAlarmName as jest.Mock
const roleName = mapper.roleName as jest.Mock
import {
  toCreateEventSourceMapping,
  toCreateFunc,
  toCreateLogGroup,
  toCreatePolicy,
  toCreateQueue,
  toCreateRole,
  toDescribeLogGroups,
  toGetQueueAttributes,
  toLambdaErrorAlarm,
  toLogErrorAlarm,
  toPutFuncConcurrency,
  toPutMetricFilter,
  toPutRetentionPolicy,
  toQueueDepthAlarm,
  toTagQueue,
} from "../../src/create/mapper"

const BATCH = 10
const CID = 123
const ENV = "test"
const FUNCTION_TIMEOUT_SEC = 11 * BATCH
const PROJECT = "webhooks"
const URL = "url"
const TOPIC_ARN = "arn:aws:sns:us-west-2:000000000000:webhooks-topic-test"
const TAGS = {
  ConsumerId: CID.toString(),
  Creator: "webhook-provisioner",
  Environment: ENV,
  Project: PROJECT,
  Team: "growth",
  Visibility: "internal",
}

test("toCreateQueue", () => {
  const qn = "qn"
  const dlqArn = "dlqArn"
  queueName.mockReturnValue(qn)

  expect(toCreateQueue(CID, dlqArn, FUNCTION_TIMEOUT_SEC)).toEqual({
    Attributes: {
      MessageRetentionPeriod: "1209600",
      RedrivePolicy: JSON.stringify({
        deadLetterTargetArn: dlqArn,
        maxReceiveCount: 10,
      }),
      VisibilityTimeout: (FUNCTION_TIMEOUT_SEC * 6).toString(),
    },
    QueueName: qn,
  })
})

test("toTagQueue", () =>
  expect(toTagQueue(CID, URL)).toEqual({
    QueueUrl: URL,
    Tags: TAGS,
  }))

test("toGetQueueAttributes", () =>
  expect(toGetQueueAttributes(URL)).toEqual({
    AttributeNames: ["QueueArn"],
    QueueUrl: URL,
  }))

test("toCreateLogGroup", () => {
  const lgn = "lgn"
  logGroupName.mockReturnValue(lgn)

  expect(toCreateLogGroup(CID)).toEqual({
    logGroupName: lgn,
    tags: TAGS,
  })
})

test("toPutRetentionPolicy", () => {
  const lgn = "lgn"
  logGroupName.mockReturnValue(lgn)

  expect(toPutRetentionPolicy(CID)).toEqual({
    logGroupName: lgn,
    retentionInDays: 365,
  })
})

test("toDescribeLogGroups", () => {
  const lgn = "lgn"
  logGroupName.mockReturnValue(lgn)

  expect(toDescribeLogGroups(CID)).toEqual({
    limit: 1,
    logGroupNamePrefix: lgn,
  })
})

test("toPutMetricFilter", () => {
  const lgn = "lgn"
  const fn = "fn"
  const mn = "mn"
  logGroupName.mockReturnValue(lgn)
  filterName.mockReturnValue(fn)
  metricName.mockReturnValue(mn)

  expect(toPutMetricFilter(CID)).toEqual({
    filterName: fn,
    filterPattern: '"[error]"',
    logGroupName: lgn,
    metricTransformations: [
      {
        metricName: mn,
        metricNamespace: "LogMetrics",
        metricValue: "1",
      },
    ],
  })
})

test("toQueueDepthAlarm", () => {
  const qn = "qn"
  const qda = "qda"
  queueName.mockReturnValue(qn)
  queueDepthAlarmName.mockReturnValue(qda)

  expect(toQueueDepthAlarm(CID, TOPIC_ARN)).toEqual({
    AlarmActions: [TOPIC_ARN],
    AlarmName: qda,
    ComparisonOperator: "GreaterThanOrEqualToThreshold",
    Dimensions: [{ Name: "QueueName", Value: qn }],
    EvaluationPeriods: 1,
    MetricName: "ApproximateAgeOfOldestMessage",
    Namespace: "AWS/SQS",
    Period: 900,
    Statistic: "Average",
    Threshold: 900,
    TreatMissingData: "ignore",
  })
})

test("toLambdaErrorAlarm", () => {
  const ln = "ln"
  const len = "len"
  lambdaName.mockReturnValue(ln)
  lambdaErrorAlarmName.mockReturnValue(len)

  expect(toLambdaErrorAlarm(CID, TOPIC_ARN)).toEqual({
    AlarmActions: [TOPIC_ARN],
    AlarmName: len,
    ComparisonOperator: "GreaterThanOrEqualToThreshold",
    Dimensions: [{ Name: "FunctionName", Value: ln }],
    EvaluationPeriods: 1,
    MetricName: "Errors",
    Namespace: "AWS/Lambda",
    Period: 60,
    Statistic: "Sum",
    Threshold: 1,
    TreatMissingData: "ignore",
  })
})

test("toLogErrorAlarm", () => {
  const mn = "mn"
  const len = "len"
  logErrorAlarmName.mockReturnValue(len)
  metricName.mockReturnValue(mn)

  expect(toLogErrorAlarm(CID, TOPIC_ARN)).toEqual({
    AlarmActions: [TOPIC_ARN],
    AlarmName: len,
    ComparisonOperator: "GreaterThanOrEqualToThreshold",
    Dimensions: [],
    EvaluationPeriods: 1,
    MetricName: mn,
    Namespace: "LogMetrics",
    Period: 60,
    Statistic: "Sum",
    Threshold: 1,
    TreatMissingData: "ignore",
  })
})

test("toCreateFunc", () => {
  const ln = "ln"
  const req = {
    cId: CID,
    concurrency: { reserved: 2, post: 5 },
    location: { bucket: "b", key: "k", version: "1.0" },
    queues: {
      error: { url: "eu", arn: "e" },
      partner: { url: "pu", arn: "p" },
      result: { url: "ru", arn: "r" },
    },
    role: { roleArn: "ra", roleName: "rn", policyArn: "pa" },
    timeout: 10,
    maxRetries: 8,
  }
  lambdaName.mockReturnValue(ln)

  expect(toCreateFunc(req)).toEqual({
    Code: { S3Bucket: req.location.bucket, S3Key: req.location.key },
    Environment: {
      Variables: {
        CONCURRENCY: req.concurrency.post.toString(),
        ERROR_QUEUE_URL: req.queues.error.url,
        PARTNER_QUEUE_URL: req.queues.partner.url,
        RESULT_QUEUE_URL: req.queues.result.url,
        VERSION: req.location.version,
        RETRIES_MAX: req.maxRetries.toString(),
      },
    },
    FunctionName: ln,
    Handler: "src/handler.handle",
    MemorySize: 128,
    Publish: true,
    Role: req.role.roleArn,
    Runtime: "nodejs10.x",
    Tags: TAGS,
    Timeout: req.timeout,
  })
})

test("toPutFuncConcurrency", () => {
  const ln = "ln"
  const con = 3
  lambdaName.mockReturnValue(ln)

  expect(toPutFuncConcurrency(CID, con)).toEqual({
    FunctionName: ln,
    ReservedConcurrentExecutions: con,
  })
})

test("toCreateEventSourceMapping", () => {
  const ln = "ln"
  const qs = {
    partner: { url: "pu", arn: "p" },
    result: { url: "ru", arn: "a" },
  }
  lambdaName.mockReturnValue(ln)

  expect(toCreateEventSourceMapping(CID, qs.partner.arn)).toEqual({
    BatchSize: BATCH,
    Enabled: true,
    EventSourceArn: qs.partner.arn,
    FunctionName: ln,
  })
})

test("toCreateRole", () => {
  const rn = "rn"
  roleName.mockReturnValue(rn)

  expect(toCreateRole(CID)).toEqual({
    AssumeRolePolicyDocument: JSON.stringify({
      Statement: [
        {
          Action: ["sts:AssumeRole"],
          Effect: "Allow",
          Principal: { Service: ["lambda.amazonaws.com"] },
        },
      ],
      Version: "2012-10-17",
    }),
    Path: "/",
    RoleName: rn,
    Tags: [
      { Key: "ConsumerId", Value: CID.toString() },
      { Key: "Creator", Value: "webhook-provisioner" },
      { Key: "Environment", Value: ENV },
      { Key: "Project", Value: PROJECT },
      { Key: "Team", Value: "growth" },
      { Key: "Visibility", Value: "internal" },
    ],
  })
})

test("toCreatePolicy", () => {
  const pn = "pn"
  const lg = { arn: "a" }
  const qs = {
    error: { url: "eu", arn: "e" },
    partner: { url: "pu", arn: "p" },
    result: { url: "ru", arn: "r" },
  }
  policyName.mockReturnValue(pn)

  expect(toCreatePolicy(CID, lg, qs)).toEqual({
    PolicyDocument: JSON.stringify({
      Statement: [
        {
          Action: [
            "sqs:DeleteMessage",
            "sqs:GetQueueAttributes",
            "sqs:ReceiveMessage",
            "sqs:SendMessage",
          ],
          Effect: "Allow",
          Resource: qs.partner.arn,
        },
        {
          Action: ["sqs:SendMessage"],
          Effect: "Allow",
          Resource: [qs.result.arn, qs.error.arn],
        },
        {
          Action: ["logs:CreateLogStream"],
          Effect: "Allow",
          Resource: lg.arn,
        },
        {
          Action: ["logs:PutLogEvents"],
          Effect: "Allow",
          Resource: `${lg.arn}:*`,
        },
      ],
      Version: "2012-10-17",
    }),
    PolicyName: pn,
  })
})
