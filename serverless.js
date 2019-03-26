const { serverless } = require("skripts/config")

const project = "webhooks"

module.exports = {
  ...serverless,
  custom: {
    ...serverless.custom,
    bucket: "${env:DEPLOYMENT_BUCKET, 'default'}",
    project,
    tags: {
      ...serverless.custom.tags,
      Project: project,
      Team: "growth",
      Visibility: "external",
      DeployJobUrl: "${env:BUILD_URL, 'n/a'}",
      "org.label-schema.vcs-url": "${env:GIT_URL, 'n/a'}",
      "org.label-schema.vcs-ref": "${env:GIT_COMMIT, 'n/a'}"
    }
  },
  functions: {
    create: { handler: "src/create/handler.handle", timeout: 120 },
    delete: { handler: "src/delete/handler.handle", timeout: 60 },
    disable: { handler: "src/disable/handler.handle", timeout: 60 },
    update: { handler: "src/update/handler.handle", timeout: 120 },
    updateCode: { handler: "src/updateCode/handler.handle", timeout: 120 }
  },
  package: { individually: "${file(./config.js):packageIndividually}" },
  plugins: [...serverless.plugins, "serverless-pseudo-parameters"],
  provider: {
    ...serverless.provider,
    environment: {
      ...serverless.provider.environment,
      DEPLOYMENT_BUCKET: "${self:custom.bucket}",
      ENVIRONMENT: "${self:provider.stage}"
    },
    iamRoleStatements: [
      {
        Effect: "Allow",
        Action: ["logs:CreateLogGroup"],
        Resource: "*"
      },
      {
        Effect: "Allow",
        Action: [
          "logs:DeleteLogGroup",
          "logs:PutMetricFilter",
          "logs:DeleteMetricFilter",
          "logs:PutRetentionPolicy"
        ],
        Resource:
          "arn:aws:logs:${self:provider.region}:#{AWS::AccountId}:log-group:/aws/lambda/${self:custom.project}-*-lambda-${self:provider.stage}:*"
      },
      {
        Effect: "Allow",
        Action: ["logs:DescribeLogGroups"],
        Resource:
          "arn:aws:logs:${self:provider.region}:#{AWS::AccountId}:log-group:*"
      },
      {
        Effect: "Allow",
        Action: ["cloudwatch:PutMetricAlarm", "cloudwatch:DeleteAlarms"],
        Resource: "*"
      },
      {
        Effect: "Allow",
        Action: ["s3:ListBucket"],
        Resource: "arn:aws:s3:::${self:custom.bucket}"
      },
      {
        Effect: "Allow",
        Action: ["s3:GetObject"],
        Resource:
          "arn:aws:s3:::${self:custom.bucket}/serverless/webhook-handler/${self:provider.stage}/*"
      },
      {
        Effect: "Allow",
        Action: ["sqs:GetQueueUrl", "sqs:GetQueueAttributes"],
        Resource: [
          { "Fn::GetAtt": ["ResultQueue98CD34E0", "Arn"] },
          { "Fn::GetAtt": ["ErrorQueue2580A2D4", "Arn"] }
        ]
      },
      {
        Effect: "Allow",
        Action: [
          "sqs:CreateQueue",
          "sqs:DeleteQueue",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl",
          "sqs:PurgeQueue",
          "sqs:SetQueueAttributes",
          "sqs:TagQueue"
        ],
        Resource:
          "arn:aws:sqs:${self:provider.region}:#{AWS::AccountId}:${self:custom.project}-*-consumer-queue-${self:provider.stage}"
      },
      {
        Effect: "Allow",
        Action: [
          "lambda:ListEventSourceMappings",
          "lambda:ListFunctions",
          "lambda:UpdateEventSourceMapping"
        ],
        Resource: "*"
      },
      {
        Effect: "Allow",
        Action: ["lambda:CreateEventSourceMapping"],
        Resource: "*",
        Condition: {
          ArnLike: {
            "lambda:FunctionArn":
              "arn:aws:lambda:${self:provider.region}:#{AWS::AccountId}:function:${self:custom.project}-*-lambda-${self:provider.stage}"
          }
        }
      },
      {
        Effect: "Allow",
        Action: ["lambda:DeleteEventSourceMapping"],
        Resource:
          "arn:aws:lambda:${self:provider.region}:#{AWS::AccountId}:event-source-mapping:*",
        Condition: {
          ArnLike: {
            "lambda:FunctionArn":
              "arn:aws:lambda:${self:provider.region}:#{AWS::AccountId}:function:${self:custom.project}-*-lambda-${self:provider.stage}"
          }
        }
      },
      {
        Effect: "Allow",
        Action: [
          "lambda:CreateFunction",
          "lambda:DeleteFunction",
          "lambda:GetFunctionConfiguration",
          "lambda:UpdateFunctionCode",
          "lambda:UpdateFunctionConfiguration",
          "lambda:PutFunctionConcurrency",
          "lambda:TagResource"
        ],
        Resource:
          "arn:aws:lambda:${self:provider.region}:#{AWS::AccountId}:function:${self:custom.project}-*-lambda-${self:provider.stage}"
      },
      {
        Effect: "Allow",
        Action: [
          "iam:AttachRolePolicy",
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:DetachRolePolicy",
          "iam:GetRole",
          "iam:PassRole",
          "iam:TagRole"
        ],
        Resource:
          "arn:aws:iam::#{AWS::AccountId}:role/${self:custom.project}-*-role-${self:provider.region}-${self:provider.stage}"
      },
      {
        Effect: "Allow",
        Action: ["iam:CreatePolicy", "iam:DeletePolicy"],
        Resource:
          "arn:aws:iam::#{AWS::AccountId}:policy/${self:custom.project}-*-policy-${self:provider.region}-${self:provider.stage}"
      },
      {
        Effect: "Allow",
        Action: ["sns:CreateTopic"],
        Resource:
          "arn:aws:sns:${self:provider.region}:#{AWS::AccountId}:cloudwatch-alarm-to-slack-topic-${self:provider.stage}"
      }
    ],
    timeout: 30
  },
  resources: "${file(./scripts/stack.yml)}"
}
