import Lambda from "aws-sdk/clients/lambda"
import SQS from "aws-sdk/clients/sqs"
import * as mapper from "../../src/mapper"

jest.mock("aws-sdk/clients/lambda")
jest.mock("aws-sdk/clients/sqs")
jest.mock("../../src/mapper")
const lam = (Lambda as unknown) as jest.Mock
const sqs = (SQS as unknown) as jest.Mock
const listEventSourceMappings = jest.fn()
const updateEventSourceMapping = jest.fn()
const getQueueUrl = jest.fn()
const purgeQueue = jest.fn()
lam.mockImplementationOnce(() => ({
  listEventSourceMappings,
  updateEventSourceMapping,
}))
sqs.mockImplementationOnce(() => ({ getQueueUrl, purgeQueue }))
const lambdaName = mapper.lambdaName as jest.Mock
const queueName = mapper.queueName as jest.Mock
import { disable } from "../../src/disable/disable"

describe("disable", () => {
  const disableEvent = { consumerId: 123, purgeQueue: true }
  const lambda = "ln"
  const queue = "qn"
  const queueUrl = "url"
  const id = "id"
  lambdaName.mockReturnValue(lambda)
  queueName.mockReturnValue(queue)
  getQueueUrl.mockReturnValue({ promise: () => ({ QueueUrl: queueUrl }) })
  listEventSourceMappings.mockReturnValue({
    promise: () => ({ EventSourceMappings: [{ UUID: id }] }),
  })
  updateEventSourceMapping.mockReturnValue({ promise: () => ({}) })

  it("disables and purges", async () => {
    purgeQueue.mockReturnValue({ promise: () => ({}) })

    await expect(disable(disableEvent)).resolves.toBe(undefined)

    expect(getQueueUrl).toHaveBeenCalledWith({ QueueName: queue })
    expect(purgeQueue).toHaveBeenCalledWith({ QueueUrl: queueUrl })
    expect(listEventSourceMappings).toHaveBeenCalledWith({
      FunctionName: lambda,
    })
    expect(updateEventSourceMapping).toHaveBeenCalledWith({
      Enabled: false,
      UUID: id,
    })
  })

  it("ignore PurgeQueueInProgress", async () => {
    purgeQueue.mockReturnValue({
      promise: () =>
        Promise.reject(
          new MyError("hi", "AWS.SimpleQueueService.PurgeQueueInProgress")
        ),
    })
    listEventSourceMappings.mockReturnValue({
      promise: () => ({ EventSourceMappings: [{ UUID: id }] }),
    })
    updateEventSourceMapping.mockReturnValue({ promise: () => ({}) })

    await expect(disable(disableEvent)).resolves.toBe(undefined)

    expect(getQueueUrl).toHaveBeenCalledWith({ QueueName: queue })
    expect(purgeQueue).toHaveBeenCalledWith({ QueueUrl: queueUrl })
  })
})

class MyError extends Error {
  protected code: string

  constructor(message: string, code: string) {
    super(message)
    this.code = code
  }
}
