const { serverless } = require("skripts/config")

const project = "webhooks"

module.exports = {
  ...serverless,
  custom: {
    ...serverless.custom,
    bucket: "${env:DEPLOYMENT_BUCKET, 'default'}",
    bucketArn: "arn:aws:s3:::${self:custom.bucket}",
    eventSourceArn:
      "arn:aws:lambda:${self:provider.region}:#{AWS::AccountId}:event-source-mapping:*",
    keyArn:
      "arn:aws:s3:::${self:custom.bucket}/serverless/webhook-handler/${self:provider.stage}/*",
    lambdaArn:
      "arn:aws:lambda:${self:provider.region}:#{AWS::AccountId}:function:${self:custom.project}-*-lambda-${self:provider.stage}",
    logGroupArn:
      "arn:aws:logs:${self:provider.region}:#{AWS::AccountId}:log-group:*",
    logStreamArn:
      "arn:aws:logs:${self:provider.region}:#{AWS::AccountId}:log-group:/aws/lambda/${self:custom.project}-*-lambda-${self:provider.stage}:*",
    policyArn:
      "arn:aws:iam::#{AWS::AccountId}:policy/${self:custom.project}-*-policy-${self:provider.region}-${self:provider.stage}",
    project,
    queueArn:
      "arn:aws:sqs:${self:provider.region}:#{AWS::AccountId}:${self:custom.project}-*-consumer-queue-${self:provider.stage}",
    roleArn:
      "arn:aws:iam::#{AWS::AccountId}:role/${self:custom.project}-*-role-${self:provider.region}-${self:provider.stage}",
    tags: {
      ...serverless.custom.tags,
      Project: project,
      Team: "growth",
      Visibility: "external",
      DeployJobUrl: "${env:BUILD_URL, 'n/a'}",
      "org.label-schema.vcs-url": "${env:GIT_URL, 'n/a'}",
      "org.label-schema.vcs-ref": "${env:GIT_COMMIT, 'n/a'}",
    },
    topicArn:
      "arn:aws:sns:${self:provider.region}:#{AWS::AccountId}:cloudwatch-alarm-to-slack-topic-${self:provider.stage}",
  },
  functions: {
    create: {
      handler: "src/create/handler.handle",
      iamRoleStatements: [
        {
          Effect: "Allow",
          Action: ["logs:CreateLogGroup"],
          Resource: "*",
        },
        {
          Effect: "Allow",
          Action: ["logs:PutMetricFilter", "logs:PutRetentionPolicy"],
          Resource: "${self:custom.logStreamArn}",
        },
        {
          Effect: "Allow",
          Action: ["logs:DescribeLogGroups"],
          Resource: "${self:custom.logGroupArn}",
        },
        {
          Effect: "Allow",
          Action: ["cloudwatch:PutMetricAlarm"],
          Resource: "*",
        },
        {
          Effect: "Allow",
          Action: ["s3:ListBucket"],
          Resource: "${self:custom.bucketArn}",
        },
        {
          Effect: "Allow",
          Action: ["s3:GetObject"],
          Resource: "${self:custom.keyArn}",
        },
        {
          Effect: "Allow",
          Action: ["sqs:GetQueueUrl", "sqs:GetQueueAttributes"],
          Resource: [
            { "Fn::GetAtt": ["ResultQueue98CD34E0", "Arn"] },
            { "Fn::GetAtt": ["ErrorQueue2580A2D4", "Arn"] },
          ],
        },
        {
          Effect: "Allow",
          Action: [
            "sqs:CreateQueue",
            "sqs:GetQueueAttributes",
            "sqs:GetQueueUrl",
            "sqs:TagQueue",
          ],
          Resource: "${self:custom.queueArn}",
        },
        {
          Effect: "Allow",
          Action: [
            "lambda:ListEventSourceMappings",
            "lambda:UpdateEventSourceMapping",
          ],
          Resource: "*",
        },
        {
          Effect: "Allow",
          Action: ["sns:CreateTopic"],
          Resource: "${self:custom.topicArn}",
        },
        {
          Effect: "Allow",
          Action: ["iam:CreatePolicy"],
          Resource: "${self:custom.policyArn}",
        },
        {
          Effect: "Allow",
          Action: ["lambda:CreateEventSourceMapping"],
          Resource: "*",
          Condition: {
            ArnLike: { "lambda:FunctionArn": "${self:custom.lambdaArn}" },
          },
        },
        {
          Effect: "Allow",
          Action: [
            "lambda:CreateFunction",
            "lambda:PutFunctionConcurrency",
            "lambda:TagResource",
          ],
          Resource: "${self:custom.lambdaArn}",
        },
        {
          Effect: "Allow",
          Action: [
            "iam:AttachRolePolicy",
            "iam:CreateRole",
            "iam:PassRole",
            "iam:TagRole",
          ],
          Resource: "${self:custom.roleArn}",
        },
      ],
      timeout: 120,
    },
    delete: {
      handler: "src/delete/handler.handle",
      iamRoleStatements: [
        {
          Effect: "Allow",
          Action: ["logs:DeleteLogGroup", "logs:DeleteMetricFilter"],
          Resource: "${self:custom.logStreamArn}",
        },
        {
          Effect: "Allow",
          Action: ["cloudwatch:DeleteAlarms"],
          Resource: "*",
        },
        {
          Effect: "Allow",
          Action: ["sqs:DeleteQueue", "sqs:GetQueueUrl"],
          Resource: "${self:custom.queueArn}",
        },
        {
          Effect: "Allow",
          Action: [
            "lambda:ListEventSourceMappings",
            "lambda:UpdateEventSourceMapping",
          ],
          Resource: "*",
        },
        {
          Effect: "Allow",
          Action: ["iam:DeletePolicy"],
          Resource: "${self:custom.policyArn}",
        },
        {
          Effect: "Allow",
          Action: ["lambda:DeleteEventSourceMapping"],
          Resource: "${self:custom.eventSourceArn}",
          Condition: {
            ArnLike: { "lambda:FunctionArn": "${self:custom.lambdaArn}" },
          },
        },
        {
          Effect: "Allow",
          Action: ["lambda:DeleteFunction"],
          Resource: "${self:custom.lambdaArn}",
        },
        {
          Effect: "Allow",
          Action: ["iam:DeleteRole", "iam:DetachRolePolicy", "iam:GetRole"],
          Resource: "${self:custom.roleArn}",
        },
      ],
      timeout: 60,
    },
    disable: {
      handler: "src/disable/handler.handle",
      iamRoleStatements: [
        {
          Effect: "Allow",
          Action: ["sqs:GetQueueUrl", "sqs:PurgeQueue"],
          Resource: "${self:custom.queueArn}",
        },
        {
          Effect: "Allow",
          Action: [
            "lambda:ListEventSourceMappings",
            "lambda:UpdateEventSourceMapping",
          ],
          Resource: "*",
        },
      ],
      timeout: 60,
    },
    update: {
      handler: "src/update/handler.handle",
      iamRoleStatements: [
        {
          Effect: "Allow",
          Action: ["sqs:GetQueueUrl", "sqs:SetQueueAttributes"],
          Resource: "${self:custom.queueArn}",
        },
        {
          Effect: "Allow",
          Action: [
            "lambda:GetFunctionConfiguration",
            "lambda:UpdateFunctionConfiguration",
            "lambda:PutFunctionConcurrency",
          ],
          Resource: "${self:custom.lambdaArn}",
        },
      ],
      timeout: 120,
    },
    updateCode: {
      handler: "src/updateCode/handler.handle",
      iamRoleStatements: [
        {
          Effect: "Allow",
          Action: ["s3:ListBucket"],
          Resource: "${self:custom.bucketArn}",
        },
        {
          Effect: "Allow",
          Action: ["s3:GetObject"],
          Resource: "${self:custom.keyArn}",
        },
        {
          Effect: "Allow",
          Action: ["lambda:ListFunctions"],
          Resource: "*",
        },
        {
          Effect: "Allow",
          Action: [
            "lambda:UpdateFunctionCode",
            "lambda:UpdateFunctionConfiguration",
          ],
          Resource: "${self:custom.lambdaArn}",
        },
      ],
      timeout: 120,
    },
  },
  package: { individually: "${file(./config.js):packageIndividually}" },
  plugins: [
    ...serverless.plugins,
    "serverless-iam-roles-per-function",
    "serverless-pseudo-parameters",
  ],
  provider: {
    ...serverless.provider,
    environment: {
      ...serverless.provider.environment,
      DEPLOYMENT_BUCKET: "${self:custom.bucket}",
      ENVIRONMENT: "${self:provider.stage}",
    },
    timeout: 30,
  },
  resources: "${file(./scripts/stack.yml)}",
}
