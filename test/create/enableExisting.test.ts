import Lambda from "aws-sdk/clients/lambda"
import SQS from "aws-sdk/clients/sqs"
import * as eventSources from "../../src/eventSources"
import * as mapper from "../../src/mapper"

jest.mock("aws-sdk/clients/lambda")
jest.mock("aws-sdk/clients/sqs")
jest.mock("../../src/eventSources")
jest.mock("../../src/mapper")
const lam = Lambda as unknown as jest.Mock
const sqs = SQS as unknown as jest.Mock
const update = eventSources.update as jest.Mock
const queueName = mapper.queueName as jest.Mock
const getQueueUrl = jest.fn()
const lamInst = jest.fn()
lam.mockImplementationOnce(() => lamInst)
sqs.mockImplementationOnce(() => ({ getQueueUrl }))
import { enableExisting } from "../../src/create/enableExisting"

describe("enableExisting", () => {
  const consumerId = 123
  const qName = "qn"
  const qUrl = "qu"

  afterEach(() => {
    getQueueUrl.mockClear()
    update.mockClear()
  })

  it("returns queueUrl", async () => {
    queueName.mockReturnValue(qName)
    update.mockResolvedValueOnce(true)
    getQueueUrl.mockReturnValue({ promise: () => ({ QueueUrl: qUrl }) })

    await expect(enableExisting(consumerId)).resolves.toEqual(qUrl)

    expect(update).toHaveBeenCalledWith(lamInst, consumerId, true)
    expect(queueName).toHaveBeenCalledWith(consumerId)
  })

  it("returns undefined if no url", async () => {
    queueName.mockReturnValue(qName)
    update.mockResolvedValueOnce(true)
    getQueueUrl.mockReturnValue({ promise: () => ({ QueueUrl: undefined }) })

    await expect(enableExisting(consumerId)).resolves.toBe(undefined)
  })

  it("returns undefined if update returns false", async () => {
    update.mockResolvedValueOnce(false)

    await expect(enableExisting(consumerId)).resolves.toBe(undefined)

    expect(getQueueUrl).not.toHaveBeenCalled()
  })
})
