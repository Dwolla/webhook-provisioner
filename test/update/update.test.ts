import Lambda, { EnvironmentVariables } from "aws-sdk/clients/lambda"
import SQS from "aws-sdk/clients/sqs"
import * as mapper from "../../src/mapper"
import { getLambdaEnvVars } from "../../src/lambdaHelpers"

jest.mock("aws-sdk/clients/lambda")
jest.mock("aws-sdk/clients/sqs")
jest.mock("../../src/mapper")
jest.mock("../../src/lambdaHelpers")
const getLambdaEnvVarsMock = jest.mocked(getLambdaEnvVars)

const putFunctionConcurrency = jest.fn()
const updateFunctionConfiguration = jest.fn()
const getQueueUrl = jest.fn()
const setQueueAttributes = jest.fn()
const lam = Lambda as unknown as jest.Mock
const sqs = SQS as unknown as jest.Mock
lam.mockImplementationOnce(() => ({
  putFunctionConcurrency,
  updateFunctionConfiguration,
}))
sqs.mockImplementationOnce(() => ({ getQueueUrl, setQueueAttributes }))
const lambdaName = mapper.lambdaName as jest.Mock
const queueName = mapper.queueName as jest.Mock
import { update } from "../../src/update/update"

test("update", async () => {
  const resourceName = "a"
  const updateEvent = {
    consumerIds: [123],
    concurrency: { reserved: 2, post: 5 },
  }
  const lName = "ln"
  const qName = "qn"
  const qUrl = "qu"
  const variables: EnvironmentVariables = { x: "1" }
  lambdaName.mockReturnValue(lName)
  queueName.mockReturnValue(qName)
  putFunctionConcurrency.mockReturnValue({ promise: () => ({}) })
  getQueueUrl.mockReturnValue({
    promise: () => ({ QueueUrl: qUrl }),
  })
  updateFunctionConfiguration.mockReturnValue({
    promise: () => ({ FunctionArn: resourceName }),
  })
  getLambdaEnvVarsMock.mockResolvedValue(variables)
  setQueueAttributes.mockReturnValue({
    promise: () => ({}),
  })

  await expect(update(updateEvent)).resolves.toEqual([{ arn: resourceName }])

  expect(queueName).toHaveBeenCalledWith(updateEvent.consumerIds[0])
  expect(getQueueUrl).toHaveBeenCalledWith({ QueueName: qName })
  expect(setQueueAttributes).toHaveBeenCalledWith({
    Attributes: { VisibilityTimeout: "192" },
    QueueUrl: qUrl,
  })
  expect(getLambdaEnvVarsMock).toHaveBeenCalledWith(lName)

  expect(putFunctionConcurrency).toHaveBeenCalledWith({
    FunctionName: lName,
    ReservedConcurrentExecutions: 2,
  })
  expect(updateFunctionConfiguration).toHaveBeenCalledWith({
    Environment: { Variables: { ...variables, CONCURRENCY: "5" } },
    FunctionName: lName,
    Timeout: 32,
  })
})
