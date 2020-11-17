import SQS from "aws-sdk/clients/sqs"
import * as mapper from "../../src/create/mapper"

jest.mock("aws-sdk/clients/sqs")
jest.mock("../../src/create/mapper")
const sqs = (SQS as unknown) as jest.Mock
const toCreateQueue = mapper.toCreateQueue as jest.Mock
const toGetQueueAttributes = mapper.toGetQueueAttributes as jest.Mock
const toTagQueue = mapper.toTagQueue as jest.Mock
const createQueue = jest.fn()
const getQueueUrl = jest.fn()
const tagQueue = jest.fn()
const getQueueAttributes = jest.fn()
sqs.mockImplementationOnce(() => ({
  createQueue,
  getQueueAttributes,
  getQueueUrl,
  tagQueue,
}))
import { createQueue as cq } from "../../src/create/createQueue"

test("createQueue", async () => {
  const cId = 123
  const to = 32
  const p = { url: "pu", arn: "p" }
  const r = { url: "ru", arn: "r" }
  const e = { url: "eu", arn: "e" }
  const cr = { x: 0 }
  const tq = { x: 1 }
  const ga = { x: 2 }
  toCreateQueue.mockReturnValue(cr)
  toGetQueueAttributes.mockReturnValue(ga)
  toTagQueue.mockReturnValue(tq)
  createQueue.mockReturnValue({ promise: () => ({ QueueUrl: p.url }) })
  tagQueue.mockReturnValue({ promise: () => ({}) })
  getQueueUrl.mockReturnValueOnce({
    promise: () => ({ QueueUrl: r.url }),
  })
  getQueueUrl.mockReturnValueOnce({
    promise: () => ({ QueueUrl: e.url }),
  })
  getQueueAttributes.mockReturnValueOnce({
    promise: () => ({ Attributes: { QueueArn: r.arn } }),
  })
  getQueueAttributes.mockReturnValueOnce({
    promise: () => ({ Attributes: { QueueArn: e.arn } }),
  })
  getQueueAttributes.mockReturnValueOnce({
    promise: () => ({ Attributes: { QueueArn: p.arn } }),
  })

  await expect(cq(cId, to)).resolves.toEqual({
    error: e,
    partner: p,
    result: r,
  })

  expect(toCreateQueue).toHaveBeenCalledWith(cId, e.arn, to)
  expect(createQueue).toHaveBeenCalledWith(cr)
  expect(toTagQueue).toHaveBeenCalledWith(cId, p.url)
  expect(tagQueue).toHaveBeenCalledWith(tq)
  expect(toGetQueueAttributes).toHaveBeenCalledWith(p.url)
  expect(toGetQueueAttributes).toHaveBeenCalledWith(r.url)
  expect(toGetQueueAttributes).toHaveBeenCalledWith(e.url)
  expect(getQueueAttributes).toHaveBeenCalledTimes(3)
})
