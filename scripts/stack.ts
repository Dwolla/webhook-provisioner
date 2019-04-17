import {
  ComparisonOperator,
  DimensionHash,
  Metric
} from "@aws-cdk/aws-cloudwatch"
import { CfnMetricFilter, LogGroup } from "@aws-cdk/aws-logs"
import { Queue } from "@aws-cdk/aws-sqs"
import { App, Stack, StackProps, Tag } from "@aws-cdk/cdk"
import { envVar, error } from "@therockstorm/utils"
import SNS from "aws-sdk/clients/sns"
import { name } from "../package.json"

type AlarmProps = Readonly<{
  alarmName: string
  metricName: string
  namespace: string
  comparisonOperator?: ComparisonOperator
  dimensions?: DimensionHash
  evaluationPeriods?: number
  periodSec?: number
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
  includeRegion: boolean = false
): string =>
  `${PROJECT}${
    typeof resourceId === "undefined" ? "" : `-${resourceId}`
  }-${resource}${includeRegion ? `-${REGION}` : ""}-${ENV}`

const capitalize = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`

class MyStack extends Stack {
  private topicArn: string

  constructor(parent: App, id: string, topicArn: string, props?: StackProps) {
    super(parent, id, props)
    this.topicArn = topicArn
    ;[
      {
        metricName: "ApproximateAgeOfOldestMessage",
        name: "result",
        statistic: "Average",
        threshold: 900
      },
      { name: "error", metricName: "NumberOfMessagesSent" }
    ].forEach(q => this.queue(q))
    ;["create", "delete", "disable", "updateCode", "update"].forEach(fn =>
      this.lambda(fn)
    )

    this.metricAlarm(`LambdaConcurrentExecutionsAlarm`, {
      alarmName: resourceName(`lambda-concurrent-executions`),
      metricName: "ConcurrentExecutions",
      namespace: "AWS/Lambda",
      statistic: "Average",
      threshold: 500
    })
  }

  private queue(ps: QueueProps) {
    const shortName = `${ps.name}-queue`
    const queueName = resourceName(shortName)
    const capped = capitalize(ps.name)
    const ref = `${capped}Queue`

    const queue = () => {
      new Queue(this, ref, { // tslint:disable-line
        queueName,
        retentionPeriodSec: 1209600,
        visibilityTimeoutSec: 180
      })
    }

    queue()
    this.metricAlarm(`${ref}DepthAlarm`, {
      alarmName: resourceName(`${ps.name}-queue-depth`),
      dimensions: { QueueName: queueName },
      metricName: ps.metricName,
      namespace: "AWS/SQS",
      periodSec: 900,
      statistic: ps.statistic,
      threshold: ps.threshold
    })
  }

  private lambda(fn: string) {
    const capped = capitalize(fn)
    const functionName = `${name}-${ENV}-${fn}`
    const ref = `${capped}LambdaFunction`
    const metricName = resourceName(`${fn}-lambda-log-error`)
    const namespace = "LogMetrics"

    const errorFilter = () => {
      const logGroup = LogGroup.import(this, `${capped}LogGroup`, {
        logGroupArn: `arn:aws:logs:${REGION}::log-group:/aws/lambda/${name}-${ENV}-${fn}`
      })
      const filter = logGroup.newMetricFilter(this, `${ref}ErrorFilter`, {
        filterPattern: { logPatternString: '"[error]"' },
        metricName,
        metricNamespace: namespace
      })
      const resource = filter.node.findChild("Resource") as CfnMetricFilter
      resource.addOverride("DependsOn", [logGroup.node.id])
    }

    this.metricAlarm(`${ref}ErrorAlarm`, {
      alarmName: resourceName(`${fn}-lambda-error`),
      dimensions: { FunctionName: functionName },
      metricName: "Errors",
      namespace: "AWS/Lambda"
    })
    errorFilter()
    this.metricAlarm(`${ref}LogErrorAlarm`, {
      alarmName: metricName,
      metricName,
      namespace
    })
  }

  private metricAlarm = (ref: string, props: AlarmProps) =>
    new Metric({
      dimensions: props.dimensions,
      metricName: props.metricName,
      namespace: props.namespace
    })
      .newAlarm(this, ref, {
        alarmName: props.alarmName,
        comparisonOperator:
          props.comparisonOperator ||
          ComparisonOperator.GreaterThanOrEqualToThreshold,
        evaluationPeriods: props.evaluationPeriods || 1,
        periodSec: props.periodSec || 60,
        statistic: props.statistic || "Sum",
        threshold: props.threshold || 1
      })
      .onAlarm({ alarmActionArn: this.topicArn })
}

const create = async () => {
  let arn = ""
  try {
    arn = (await new SNS({ region: REGION })
      .createTopic({ Name: `cloudwatch-alarm-to-slack-topic-${ENV}` })
      .promise()).TopicArn as string
  } catch (e) {
    error({ code: e.code, message: e.message })
  }
  const app = new App()
  const stack = new MyStack(app, "Stack", arn)
  stack.node.apply(new Tag("Environment", ENV))
  stack.node.apply(new Tag("Project", PROJECT))
  stack.node.apply(new Tag("Creator", "serverless"))
  stack.node.apply(new Tag("Team", "growth"))
  stack.node.apply(new Tag("Visibility", "external"))
  if (BUILD_URL) stack.node.apply(new Tag("DeployJobUrl", BUILD_URL))
  if (GIT_URL) {
    stack.node.apply(new Tag("org.label-schema.vcs-url", GIT_URL))
  }
  if (GIT_COMMIT) {
    stack.node.apply(new Tag("org.label-schema.vcs-ref", GIT_COMMIT))
  }
  app.run()
}

create()
