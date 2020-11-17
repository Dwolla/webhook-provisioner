import { Dimension, PutMetricAlarmInput } from "aws-sdk/clients/cloudwatch"
import {
  CreateLogGroupRequest,
  DescribeLogGroupsRequest,
  PutMetricFilterRequest,
  PutRetentionPolicyRequest,
  Tags,
} from "aws-sdk/clients/cloudwatchlogs"
import {
  CreatePolicyRequest,
  CreateRoleRequest,
  tagListType as ITags,
} from "aws-sdk/clients/iam"
import {
  CreateEventSourceMappingRequest,
  CreateFunctionRequest,
  PutFunctionConcurrencyRequest,
  Tags as LTags,
} from "aws-sdk/clients/lambda"
import {
  CreateQueueRequest,
  GetQueueAttributesRequest,
  TagMap as STags,
  TagQueueRequest,
} from "aws-sdk/clients/sqs"
import { ConsumerId, CreateFuncReq, LogGroup, Queues } from ".."
import { name } from "../../package.json"
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
  roleName,
} from "../mapper"
import { BATCH, ENV, PROJECT } from "../util"

interface IAlarmProps {
  alarmName: string
  dimensions?: Dimension[]
  metricName: string
  namespace: string
  period?: number
  statistic?: string
  threshold?: number
}

export const toCreateQueue = (
  cId: ConsumerId,
  dlqArn: string,
  funcTimeout: number
): CreateQueueRequest => ({
  // Best practice min maxReceiveCount is 5 and VisibilityTimeout is 6x function timeout, https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
  Attributes: {
    MessageRetentionPeriod: "1209600", // 14 days
    RedrivePolicy: JSON.stringify({
      deadLetterTargetArn: dlqArn,
      maxReceiveCount: 10,
    }),
    VisibilityTimeout: (funcTimeout * 6).toString(),
  },
  QueueName: queueName(cId),
})

export const toTagQueue = (
  cId: ConsumerId,
  queueUrl: string
): TagQueueRequest => ({
  QueueUrl: queueUrl,
  Tags: tags(cId, false) as STags,
})

export const toGetQueueAttributes = (
  queueUrl: string
): GetQueueAttributesRequest => ({
  AttributeNames: ["QueueArn"],
  QueueUrl: queueUrl,
})

export const toCreateLogGroup = (cId: ConsumerId): CreateLogGroupRequest => ({
  logGroupName: logGroupName(cId),
  tags: tags(cId, false) as Tags,
})

export const toPutRetentionPolicy = (
  cId: ConsumerId
): PutRetentionPolicyRequest => ({
  logGroupName: logGroupName(cId),
  retentionInDays: 365,
})

export const toDescribeLogGroups = (
  cId: ConsumerId
): DescribeLogGroupsRequest => ({
  limit: 1,
  logGroupNamePrefix: logGroupName(cId),
})

export const toPutMetricFilter = (cId: ConsumerId): PutMetricFilterRequest => ({
  filterName: filterName(cId),
  filterPattern: '"[error]"',
  logGroupName: logGroupName(cId),
  metricTransformations: [
    {
      metricName: metricName(cId),
      metricNamespace: "LogMetrics",
      metricValue: "1",
    },
  ],
})

export const toQueueDepthAlarm = (cId: ConsumerId, topicArn: string) =>
  toPutMetricAlarm(topicArn, {
    alarmName: queueDepthAlarmName(cId),
    dimensions: [{ Name: "QueueName", Value: queueName(cId) }],
    metricName: "ApproximateAgeOfOldestMessage",
    namespace: "AWS/SQS",
    period: 900,
    statistic: "Average",
    threshold: 900,
  })

export const toLambdaErrorAlarm = (cId: ConsumerId, topicArn: string) =>
  toPutMetricAlarm(topicArn, {
    alarmName: lambdaErrorAlarmName(cId),
    dimensions: [{ Name: "FunctionName", Value: lambdaName(cId) }],
    metricName: "Errors",
    namespace: "AWS/Lambda",
  })

export const toLogErrorAlarm = (cId: ConsumerId, topicArn: string) =>
  toPutMetricAlarm(topicArn, {
    alarmName: logErrorAlarmName(cId),
    metricName: metricName(cId),
    namespace: "LogMetrics",
  })

export const toCreateFunc = (req: CreateFuncReq): CreateFunctionRequest => ({
  Code: { S3Bucket: req.location.bucket, S3Key: req.location.key },
  Environment: {
    Variables: {
      CONCURRENCY: req.concurrency.post.toString(),
      ERROR_QUEUE_URL: req.queues.error.url,
      PARTNER_QUEUE_URL: req.queues.partner.url,
      RESULT_QUEUE_URL: req.queues.result.url,
      VERSION: req.location.version,
    },
  },
  FunctionName: lambdaName(req.cId),
  Handler: "src/handler.handle",
  MemorySize: 128,
  Publish: true,
  Role: req.role.roleArn,
  Runtime: "nodejs10.x",
  Tags: tags(req.cId, false) as LTags,
  Timeout: req.timeout,
})

export const toPutFuncConcurrency = (
  cId: ConsumerId,
  con: number
): PutFunctionConcurrencyRequest => ({
  FunctionName: lambdaName(cId),
  ReservedConcurrentExecutions: con,
})

export const toCreateEventSourceMapping = (
  cId: ConsumerId,
  arn: string
): CreateEventSourceMappingRequest => ({
  BatchSize: BATCH,
  Enabled: true,
  EventSourceArn: arn,
  FunctionName: lambdaName(cId),
})

export const toCreateRole = (cId: ConsumerId): CreateRoleRequest => ({
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
  RoleName: roleName(cId),
  Tags: tags(cId, true) as ITags,
})

export const toCreatePolicy = (
  cId: ConsumerId,
  lg: LogGroup,
  qs: Queues
): CreatePolicyRequest => ({
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
  PolicyName: policyName(cId),
})

const tags = (cId: ConsumerId, list: boolean): Tags | LTags | STags | ITags => {
  const t: any = {
    ConsumerId: cId.toString(),
    Creator: name,
    Environment: ENV,
    Project: PROJECT,
    Team: "growth",
    Visibility: "internal",
  }
  return list ? Object.entries(t).map(([k, v]) => ({ Key: k, Value: v })) : t
}

const toPutMetricAlarm = (
  topicArn: string,
  props: IAlarmProps
): PutMetricAlarmInput => ({
  AlarmActions: [topicArn],
  AlarmName: props.alarmName,
  ComparisonOperator: "GreaterThanOrEqualToThreshold",
  Dimensions: props.dimensions || [],
  EvaluationPeriods: 1,
  MetricName: props.metricName,
  Namespace: props.namespace,
  Period: props.period || 60,
  Statistic: props.statistic || "Sum",
  Threshold: props.threshold || 1,
})
