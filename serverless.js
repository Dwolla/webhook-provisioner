const project = "webhooks"

module.exports = {
  service: "${file(./package.json):name}",
  vpc:
    process.env.SKRIPTS_VPC_SECURITY_GROUPS && process.env.SKRIPTS_VPC_SUBNETS
      ? {
          securityGroupIds: process.env.SKRIPTS_VPC_SECURITY_GROUPS.split(","),
          subnetIds: process.env.SKRIPTS_VPC_SUBNETS.split(","),
        }
      : null,
  frameworkVersion: "3",
  cfnRole: process.env.SKRIPTS_CFN_ROLE || null,
  custom: {
    bucket: "${env:SKRIPTS_DEPLOYMENT_BUCKET, 'default'}",
    bucketArn: "arn:aws:s3:::${self:custom.bucket}",
    eventSourceArn:
      "arn:aws:lambda:${self:provider.region}:${aws:accountId}:event-source-mapping:*",
    keyArn:
      "arn:aws:s3:::${self:custom.bucket}/serverless/webhook-handler/${self:provider.stage}/*",
    lambdaArn:
      "arn:aws:lambda:${self:provider.region}:${aws:accountId}:function:${self:custom.project}-*-lambda-${self:provider.stage}",
    logGroupArn:
      "arn:aws:logs:${self:provider.region}:${aws:accountId}:log-group:*",
    logStreamArn:
      "arn:aws:logs:${self:provider.region}:${aws:accountId}:log-group:/aws/lambda/${self:custom.project}-*-lambda-${self:provider.stage}:*",
    policyArn:
      "arn:aws:iam::${aws:accountId}:policy/${self:custom.project}-*-policy-${self:provider.region}-${self:provider.stage}",
    project,
    queueArn:
      "arn:aws:sqs:${self:provider.region}:${aws:accountId}:${self:custom.project}-*-consumer-queue-${self:provider.stage}",
    retriesMax: "${env:RETRIES_MAX, '8'}",
    roleArn:
      "arn:aws:iam::${aws:accountId}:role/${self:custom.project}-*-role-${self:provider.region}-${self:provider.stage}",
    tags: {
      Creator: "serverless",
      Environment: "${self:provider.stage}",
      Project: project,
      Team: "growth",
      Visibility: "external",
      DeployJobUrl: "${env:BUILD_URL, 'n/a'}",
      "org.label-schema.vcs-url": "${env:GIT_URL, 'n/a'}",
      "org.label-schema.vcs-ref": "${env:GIT_COMMIT, 'n/a'}",
    },
    topicArn:
      "arn:aws:sns:${self:provider.region}:${aws:accountId}:cloudwatch-alarm-to-slack-topic-${self:provider.stage}",
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
            { "Fn::GetAtt": ["ErrorQueue2580A2D4", "Arn"] },
            { "Fn::GetAtt": ["ResultQueue98CD34E0", "Arn"] },
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
            "lambda:GetFunction",
          ],
          Resource: "${self:custom.lambdaArn}",
        },
      ],
      timeout: 120,
    },
    updateConsumersCode: {
      handler: "src/updateCode/handler.updateConsumersCodeHandler",
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
            "lambda:GetFunction",
            "lambda:GetFunctionConfiguration",
          ],
          Resource: "${self:custom.lambdaArn}",
        },
      ],
      timeout: 120,
    },
  },
  package: {
    individually: '${file(./config.js):packageIndividually(), "false"}',
  },
  plugins: ["serverless-iam-roles-per-function", "serverless-webpack"],
  provider: {
    deploymentBucket: process.env.SKRIPTS_DEPLOYMENT_BUCKET
      ? {
          name: process.env.SKRIPTS_DEPLOYMENT_BUCKET,
          serverSideEncryption: "AES256",
        }
      : null,
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: 1,
      DEPLOYMENT_BUCKET: "${self:custom.bucket}",
      ENVIRONMENT: "${opt:stage, env:ENVIRONMENT}",
      RETRIES_MAX: "${self:custom.retriesMax}",
    },
    logRetentionInDays: 365,
    memorySize: 128,
    name: "aws",
    region: "us-west-2",
    stackTags: "${self:custom.tags}",
    stage: "${opt:stage, env:ENVIRONMENT}",
    tags: "${self:custom.tags}",
    timeout: 30,
    runtime: "nodejs20.x",
  },
  resources: "${file(./scripts/stack.yml)}",
}
