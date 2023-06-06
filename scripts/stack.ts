import {
  ComparisonOperator,
  DimensionHash,
  Metric,
} from "@aws-cdk/aws-cloudwatch"
import { SnsAction } from "@aws-cdk/aws-cloudwatch-actions"
import { CfnMetricFilter, LogGroup } from "@aws-cdk/aws-logs"
import { ITopic, Topic } from "@aws-cdk/aws-sns"
import { Queue } from "@aws-cdk/aws-sqs"
import {
  App,
  Duration,
  Stack,
  StackProps,
  Tag,
  CfnResource,
} from "@aws-cdk/core"
import { envVar } from "@therockstorm/utils"
import { error } from "../src/logger"
import SNS from "aws-sdk/clients/sns"
import { name } from "../package.json"

type AlarmProps = Readonly<{
  alarmName: string
  metricName: string
  namespace: string
  comparisonOperator?: ComparisonOperator
  dimensions?: DimensionHash
  evaluationPeriods?: number
  period?: Duration
  statistic?: string
  threshold?: number
}>

type QueueProps = Readonly<{
  name: string
  metricName: string
  threshold?: number
  statistic?: string
}>

const BUILD_URL = process.env.BUILD_URL
const ENV = envVar("ENVIRONMENT")
const GIT_COMMIT = process.env.GIT_COMMIT
const GIT_URL = process.env.GIT_URL
const PROJECT = "webhooks"
const REGION = process.env.AWS_REGION || "us-west-2"

const resourceName = (
  resource: string,
  resourceId?: string,
  includeRegion = false
): string =>
  `${PROJECT}${
    typeof resourceId === "undefined" ? "" : `-${resourceId}`
  }-${resource}${includeRegion ? `-${REGION}` : ""}-${ENV}`

const capitalize = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`

class MyStack extends Stack {
  private topic: ITopic

  constructor(parent: App, id: string, topicArn: string, props?: StackProps) {
    super(parent, id, props)
    this.topic = Topic.fromTopicArn(this, "SnsTopic", topicArn)
    ;[
      {
        metricName: "ApproximateAgeOfOldestMessage",
        name: "result",
        statistic: "Average",
        threshold: 900,
      },
      { name: "error", metricName: "NumberOfMessagesSent" },
    ].forEach((q) => this.queue(q))
    ;["create", "delete", "disable", "updateCode", "update"].forEach((fn) =>
      this.lambda(fn)
    )

    this.metricAlarm(`LambdaConcurrentExecutionsAlarm`, {
      alarmName: resourceName(`lambda-concurrent-executions`),
      metricName: "ConcurrentExecutions",
      namespace: "AWS/Lambda",
      statistic: "Average",
      threshold: 500,
    })
  }

  private queue(ps: QueueProps) {
    const shortName = `${ps.name}-queue`
    const queueName = resourceName(shortName)
    const capped = capitalize(ps.name)
    const ref = `${capped}Queue`

    const queue = () => {
      const newQueue = new Queue(this, ref, {
        // tslint:disable-line
        queueName,
        retentionPeriod: Duration.days(14),
        visibilityTimeout: Duration.minutes(3),
      })
      const cfnQueue = newQueue.node.defaultChild as CfnResource
      if (ref == "ResultQueue") {
        cfnQueue.overrideLogicalId("ResultQueue98CD34E0")
      } else if (ref == "ErrorQueue") {
        cfnQueue.overrideLogicalId("ErrorQueue2580A2D4")
      } else {
        cfnQueue.overrideLogicalId(ref)
      }
    }

    queue()
    this.metricAlarm(`${ref}DepthAlarm`, {
      alarmName: resourceName(`${ps.name}-queue-depth`),
      dimensions: { QueueName: queueName },
      metricName: ps.metricName,
      namespace: "AWS/SQS",
      period: Duration.minutes(15),
      statistic: ps.statistic,
      threshold: ps.threshold,
    })
  }

  private lambda(fn: string) {
    const capped = capitalize(fn)
    const functionName = `${name}-${ENV}-${fn}`
    const ref = `${capped}LambdaFunction`
    const metricName = resourceName(`${fn}-lambda-log-error`)
    const namespace = "LogMetrics"

    const errorFilter = () => {
      const logGroup = LogGroup.fromLogGroupArn(
        this,
        `${capped}LogGroup`,
        `arn:aws:logs:${REGION}::log-group:/aws/lambda/${name}-${ENV}-${fn}`
      )
      const filter = logGroup.addMetricFilter(`${ref}ErrorFilter`, {
        filterPattern: { logPatternString: '"[error]"' },
        metricName,
        metricNamespace: namespace,
      })
      const resource = filter.node.findChild("Resource") as CfnMetricFilter
      resource.addOverride("DependsOn", [logGroup.node.id])
    }

    this.metricAlarm(`${ref}ErrorAlarm`, {
      alarmName: resourceName(`${fn}-lambda-error`),
      dimensions: { FunctionName: functionName },
      metricName: "Errors",
      namespace: "AWS/Lambda",
    })
    errorFilter()
    this.metricAlarm(`${ref}LogErrorAlarm`, {
      alarmName: metricName,
      metricName,
      namespace,
    })
  }

  private metricAlarm = (ref: string, props: AlarmProps) =>
    new Metric({
      dimensions: props.dimensions,
      metricName: props.metricName,
      namespace: props.namespace,
    })
      .createAlarm(this, ref, {
        alarmName: props.alarmName,
        comparisonOperator:
          props.comparisonOperator ||
          ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        evaluationPeriods: props.evaluationPeriods || 1,
        period: props.period || Duration.minutes(1),
        statistic: props.statistic || "Sum",
        threshold: props.threshold || 1,
      })
      .addAlarmAction(new SnsAction(this.topic))
}

const create = async () => {
  let arn = ""
  try {
    arn = (
      await new SNS({ region: REGION })
        .createTopic({ Name: `cloudwatch-alarm-to-slack-topic-${ENV}` })
        .promise()
    ).TopicArn as string
  } catch (e) {
    error({ code: e.code, message: e.message })
  }
  const app = new App()
  const stack = new MyStack(app, "Stack", arn)
  stack.node.applyAspect(new Tag("Environment", ENV))
  stack.node.applyAspect(new Tag("Project", PROJECT))
  stack.node.applyAspect(new Tag("Creator", "serverless"))
  stack.node.applyAspect(new Tag("Team", "growth"))
  stack.node.applyAspect(new Tag("Visibility", "external"))
  if (BUILD_URL) {
    stack.node.applyAspect(new Tag("DeployJobUrl", BUILD_URL))
  }
  if (GIT_URL) {
    stack.node.applyAspect(new Tag("org.label-schema.vcs-url", GIT_URL))
  }
  if (GIT_COMMIT) {
    stack.node.applyAspect(new Tag("org.label-schema.vcs-ref", GIT_COMMIT))
  }
  app.synth()
}

create()
