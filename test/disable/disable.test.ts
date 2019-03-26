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
  updateEventSourceMapping
}))
sqs.mockImplementationOnce(() => ({ getQueueUrl, purgeQueue }))
const lambdaName = mapper.lambdaName as jest.Mock
const queueName = mapper.queueName as jest.Mock
import { disable } from "../../src/disable/disable"

describe("disable", () => {
  const evt = { consumerId: 123, purgeQueue: true }
  const ln = "ln"
  const qn = "qn"
  const url = "url"
  const id = "id"
  lambdaName.mockReturnValue(ln)
  queueName.mockReturnValue(qn)
  getQueueUrl.mockReturnValue({ promise: () => ({ QueueUrl: url }) })
  listEventSourceMappings.mockReturnValue({
    promise: () => ({ EventSourceMappings: [{ UUID: id }] })
  })
  updateEventSourceMapping.mockReturnValue({ promise: () => ({}) })

  it("disables and purges", async () => {
    purgeQueue.mockReturnValue({ promise: () => ({}) })

    await expect(disable(evt)).resolves.toBe(undefined)

    expect(getQueueUrl).toHaveBeenCalledWith({ QueueName: qn })
    expect(purgeQueue).toHaveBeenCalledWith({ QueueUrl: url })
    expect(listEventSourceMappings).toHaveBeenCalledWith({ FunctionName: ln })
    expect(updateEventSourceMapping).toHaveBeenCalledWith({
      Enabled: false,
      UUID: id
    })
  })

  it("ignore PurgeQueueInProgress", async () => {
    purgeQueue.mockReturnValue({
      promise: () =>
        Promise.reject(
          new MyError("hi", "AWS.SimpleQueueService.PurgeQueueInProgress")
        )
    })
    listEventSourceMappings.mockReturnValue({
      promise: () => ({ EventSourceMappings: [{ UUID: id }] })
    })
    updateEventSourceMapping.mockReturnValue({ promise: () => ({}) })

    await expect(disable(evt)).resolves.toBe(undefined)

    expect(getQueueUrl).toHaveBeenCalledWith({ QueueName: qn })
    expect(purgeQueue).toHaveBeenCalledWith({ QueueUrl: url })
  })
})

class MyError extends Error {
  protected code: string

  constructor(message: string, code: string) {
    super(message)
    this.code = code
  }
}
