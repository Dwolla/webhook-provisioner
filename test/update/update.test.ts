import Lambda from "aws-sdk/clients/lambda"
import SQS from "aws-sdk/clients/sqs"
import * as mapper from "../../src/mapper"

jest.mock("aws-sdk/clients/lambda")
jest.mock("aws-sdk/clients/sqs")
jest.mock("../../src/mapper")
const putFunctionConcurrency = jest.fn()
const updateFunctionConfiguration = jest.fn()
const getFunctionConfiguration = jest.fn()
const getQueueUrl = jest.fn()
const setQueueAttributes = jest.fn()
const lam = (Lambda as unknown) as jest.Mock
const sqs = (SQS as unknown) as jest.Mock
lam.mockImplementationOnce(() => ({
  getFunctionConfiguration,
  putFunctionConcurrency,
  updateFunctionConfiguration,
}))
sqs.mockImplementationOnce(() => ({ getQueueUrl, setQueueAttributes }))
const lambdaName = mapper.lambdaName as jest.Mock
const queueName = mapper.queueName as jest.Mock
import { update } from "../../src/update/update"

test("update", async () => {
  const arn = "a"
  const evt = { consumerIds: [123], concurrency: { reserved: 2, post: 5 } }
  const ln = "ln"
  const qn = "qn"
  const qu = "qu"
  const vs = { x: 1 }
  lambdaName.mockReturnValue(ln)
  queueName.mockReturnValue(qn)
  putFunctionConcurrency.mockReturnValue({ promise: () => ({}) })
  getQueueUrl.mockReturnValue({
    promise: () => ({ QueueUrl: qu }),
  })
  updateFunctionConfiguration.mockReturnValue({
    promise: () => ({ FunctionArn: arn }),
  })
  getFunctionConfiguration.mockReturnValue({
    promise: () => ({ Environment: { Variables: vs } }),
  })
  setQueueAttributes.mockReturnValue({
    promise: () => ({}),
  })

  await expect(update(evt)).resolves.toEqual([{ arn }])

  expect(queueName).toHaveBeenCalledWith(evt.consumerIds[0])
  expect(getQueueUrl).toHaveBeenCalledWith({ QueueName: qn })
  expect(setQueueAttributes).toHaveBeenCalledWith({
    Attributes: { VisibilityTimeout: "192" },
    QueueUrl: qu,
  })
  expect(getFunctionConfiguration).toHaveBeenCalledWith({ FunctionName: ln })
  expect(putFunctionConcurrency).toHaveBeenCalledWith({
    FunctionName: ln,
    ReservedConcurrentExecutions: 2,
  })
  expect(updateFunctionConfiguration).toHaveBeenCalledWith({
    Environment: { Variables: { ...vs, CONCURRENCY: "5" } },
    FunctionName: ln,
    Timeout: 32,
  })
})
