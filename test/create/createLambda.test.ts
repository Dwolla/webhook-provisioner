import Lambda from "aws-sdk/clients/lambda"
import * as mapper from "../../src/create/mapper"

jest.mock("aws-sdk/clients/lambda")
jest.mock("../../src/create/mapper")
const lam = Lambda as unknown as jest.Mock
const toCreateEventSourceMapping =
  mapper.toCreateEventSourceMapping as jest.Mock
const toCreateFunc = mapper.toCreateFunc as jest.Mock
const toPutFuncConcurrency = mapper.toPutFuncConcurrency as jest.Mock
const createFunction = jest.fn()
const putFunctionConcurrency = jest.fn()
const createEventSourceMapping = jest.fn()
lam.mockImplementationOnce(() => ({
  createEventSourceMapping,
  createFunction,
  putFunctionConcurrency,
}))
import { createLambda } from "../../src/create/createLambda"

test("createLambda", async () => {
  const resourceName = "arn"
  const eventId = "eId"
  const eventSourceMapping = { x: 0 }
  const createFunctionResponse = { x: 1 }
  const concurrencyRequest = { x: 2 }
  const createRequest = {
    cId: 123,
    concurrency: { reserved: 2, post: 5 },
    location: { bucket: "b", key: "k", version: "1.0" },
    queues: {
      error: { url: "eu", arn: "e" },
      partner: { url: "pu", arn: "p" },
      result: { url: "ru", arn: "r" },
    },
    role: { roleArn: "ra", roleName: "rn", policyArn: "pa" },
    timeout: 10,
    maxRetries: 8,
  }
  toCreateFunc.mockReturnValue(createFunctionResponse)
  toPutFuncConcurrency.mockReturnValue(concurrencyRequest)
  toCreateEventSourceMapping.mockReturnValue(eventSourceMapping)
  createFunction.mockReturnValue({
    promise: () => ({ FunctionArn: resourceName }),
  })
  putFunctionConcurrency.mockReturnValue({ promise: () => ({}) })
  createEventSourceMapping.mockReturnValue({
    promise: () => ({ UUID: eventId }),
  })

  await expect(createLambda(createRequest)).resolves.toEqual({
    arn: resourceName,
    eventSourceId: eventId,
  })

  expect(toCreateFunc).toHaveBeenCalledWith(createRequest)
  expect(createFunction).toHaveBeenCalledWith(createFunctionResponse)
  expect(toPutFuncConcurrency).toHaveBeenCalledWith(createRequest.cId, 2)
  expect(putFunctionConcurrency).toHaveBeenCalledWith(concurrencyRequest)
  expect(toCreateEventSourceMapping).toHaveBeenCalledWith(
    createRequest.cId,
    createRequest.queues.partner.arn
  )
  expect(createEventSourceMapping).toHaveBeenCalledWith(eventSourceMapping)
})
