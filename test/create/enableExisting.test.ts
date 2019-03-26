import Lambda from "aws-sdk/clients/lambda"
import SQS from "aws-sdk/clients/sqs"
import * as eventSources from "../../src/eventSources"
import * as mapper from "../../src/mapper"

jest.mock("aws-sdk/clients/lambda")
jest.mock("aws-sdk/clients/sqs")
jest.mock("../../src/eventSources")
jest.mock("../../src/mapper")
const lam = (Lambda as unknown) as jest.Mock
const sqs = (SQS as unknown) as jest.Mock
const update = eventSources.update as jest.Mock
const queueName = mapper.queueName as jest.Mock
const getQueueUrl = jest.fn()
const lamInst = jest.fn()
lam.mockImplementationOnce(() => lamInst)
sqs.mockImplementationOnce(() => ({ getQueueUrl }))
import { enableExisting as ee } from "../../src/create/enableExisting"

describe("enableExisting", () => {
  const cId = 123
  const qn = "qn"
  const qu = "qu"

  afterEach(() => {
    getQueueUrl.mockClear()
    update.mockClear()
  })

  it("returns queueUrl", async () => {
    queueName.mockReturnValue(qn)
    update.mockResolvedValueOnce(true)
    getQueueUrl.mockReturnValue({ promise: () => ({ QueueUrl: qu }) })

    await expect(ee(cId)).resolves.toEqual(qu)

    expect(update).toHaveBeenCalledWith(lamInst, cId, true)
    expect(queueName).toHaveBeenCalledWith(cId)
  })

  it("returns undefined if no url", async () => {
    queueName.mockReturnValue(qn)
    update.mockResolvedValueOnce(true)
    getQueueUrl.mockReturnValue({ promise: () => ({ QueueUrl: undefined }) })

    await expect(ee(cId)).resolves.toBe(undefined)
  })

  it("returns undefined if update returns false", async () => {
    update.mockResolvedValueOnce(false)

    await expect(ee(cId)).resolves.toBe(undefined)

    expect(getQueueUrl).not.toHaveBeenCalled()
  })
})
