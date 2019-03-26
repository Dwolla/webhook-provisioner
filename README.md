# webhook-provisioner

Lambda functions to create, update, and delete partner-specific webhook SQS queues and Lambda handlers using code from [`webhook-handler`](https://github.com/dwolla/webhook-handler).

## Setup

- Clone the repository and run `npm install`
- Ensure your [AWS credentials are available](https://serverless.com/framework/docs/providers/aws/guide/credentials/)
- Deploy with `ENVIRONMENT=your-env DEPLOYMENT_BUCKET=your-bucket npm run deploy`

## Developing

- Run tests, `npm test`
- Invoke locally, `npm run start` and browse to the localhost port logged.
