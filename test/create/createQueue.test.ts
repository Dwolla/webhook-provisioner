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
  const consumerId = 123
  const timeout = 32
  const partner = { url: "pu", arn: "p" }
  const result = { url: "ru", arn: "r" }
  const error = { url: "eu", arn: "e" }
  const createQueueRequest = { x: 0 }
  const tagQueueRequest = { x: 1 }
  const getQueueAttributesRequest = { x: 2 }
  toCreateQueue.mockReturnValue(createQueueRequest)
  toGetQueueAttributes.mockReturnValue(getQueueAttributesRequest)
  toTagQueue.mockReturnValue(tagQueueRequest)
  createQueue.mockReturnValue({ promise: () => ({ QueueUrl: partner.url }) })
  tagQueue.mockReturnValue({ promise: () => ({}) })
  getQueueUrl.mockReturnValueOnce({
    promise: () => ({ QueueUrl: result.url }),
  })
  getQueueUrl.mockReturnValueOnce({
    promise: () => ({ QueueUrl: error.url }),
  })
  getQueueAttributes.mockReturnValueOnce({
    promise: () => ({ Attributes: { QueueArn: result.arn } }),
  })
  getQueueAttributes.mockReturnValueOnce({
    promise: () => ({ Attributes: { QueueArn: error.arn } }),
  })
  getQueueAttributes.mockReturnValueOnce({
    promise: () => ({ Attributes: { QueueArn: partner.arn } }),
  })

  await expect(cq(consumerId, timeout)).resolves.toEqual({
    error: error,
    partner: partner,
    result: result,
  })

  expect(toCreateQueue).toHaveBeenCalledWith(consumerId, error.arn, timeout)
  expect(createQueue).toHaveBeenCalledWith(createQueueRequest)
  expect(toTagQueue).toHaveBeenCalledWith(consumerId, partner.url)
  expect(tagQueue).toHaveBeenCalledWith(tagQueueRequest)
  expect(toGetQueueAttributes).toHaveBeenCalledWith(partner.url)
  expect(toGetQueueAttributes).toHaveBeenCalledWith(result.url)
  expect(toGetQueueAttributes).toHaveBeenCalledWith(error.url)
  expect(getQueueAttributes).toHaveBeenCalledTimes(3)
})
