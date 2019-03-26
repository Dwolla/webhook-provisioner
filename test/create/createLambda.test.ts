import Lambda from "aws-sdk/clients/lambda"
import * as mapper from "../../src/create/mapper"

jest.mock("aws-sdk/clients/lambda")
jest.mock("../../src/create/mapper")
const lam = (Lambda as unknown) as jest.Mock
const toCreateEventSourceMapping = mapper.toCreateEventSourceMapping as jest.Mock
const toCreateFunc = mapper.toCreateFunc as jest.Mock
const toPutFuncConcurrency = mapper.toPutFuncConcurrency as jest.Mock
const createFunction = jest.fn()
const putFunctionConcurrency = jest.fn()
const createEventSourceMapping = jest.fn()
lam.mockImplementationOnce(() => ({
  createEventSourceMapping,
  createFunction,
  putFunctionConcurrency
}))
import { createLambda } from "../../src/create/createLambda"

test("createLambda", async () => {
  const arn = "arn"
  const eId = "eId"
  const esm = { x: 0 }
  const cf = { x: 1 }
  const pfc = { x: 2 }
  const req = {
    cId: 123,
    concurrency: { reserved: 2, post: 5 },
    location: { bucket: "b", key: "k", version: "1.0" },
    queues: {
      error: { url: "eu", arn: "e" },
      partner: { url: "pu", arn: "p" },
      result: { url: "ru", arn: "r" }
    },
    role: { roleArn: "ra", roleName: "rn", policyArn: "pa" },
    timeout: 10
  }
  toCreateFunc.mockReturnValue(cf)
  toPutFuncConcurrency.mockReturnValue(pfc)
  toCreateEventSourceMapping.mockReturnValue(esm)
  createFunction.mockReturnValue({ promise: () => ({ FunctionArn: arn }) })
  putFunctionConcurrency.mockReturnValue({ promise: () => ({}) })
  createEventSourceMapping.mockReturnValue({ promise: () => ({ UUID: eId }) })

  await expect(createLambda(req)).resolves.toEqual({
    arn,
    eventSourceId: eId
  })

  expect(toCreateFunc).toHaveBeenCalledWith(req)
  expect(createFunction).toHaveBeenCalledWith(cf)
  expect(toPutFuncConcurrency).toHaveBeenCalledWith(req.cId, 2)
  expect(putFunctionConcurrency).toHaveBeenCalledWith(pfc)
  expect(toCreateEventSourceMapping).toHaveBeenCalledWith(
    req.cId,
    req.queues.partner.arn
  )
  expect(createEventSourceMapping).toHaveBeenCalledWith(esm)
})
