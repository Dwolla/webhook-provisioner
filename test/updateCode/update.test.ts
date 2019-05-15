import Lambda from "aws-sdk/clients/lambda"
import * as lc from "../../src/latestCode"

jest.mock("aws-sdk/clients/lambda")
jest.mock("../../src/latestCode")
const updateFunctionCode = jest.fn()
const updateFunctionConfiguration = jest.fn()
const listFunctions = jest.fn()
const lam = (Lambda as unknown) as jest.Mock
lam.mockImplementationOnce(() => ({
  listFunctions,
  updateFunctionCode,
  updateFunctionConfiguration
}))
const latestCode = lc.latestCode as jest.Mock
import { updateAll } from "../../src/updateCode/update"

test("update", async () => {
  const arn = "a"
  const con = "5"
  const ver = 1
  const c = { bucket: "b", key: "k", version: (ver + 1).toString() }
  const valid = (n: number) => `webhooks-${n}-lambda-test`
  let i = 0
  const noName = { Environment: { Variables: { VERSION: ver.toString() } } }
  const wrongName = {
    Environment: { Variables: { VERSION: ver.toString() } },
    FunctionName: "f"
  }
  const noEnv = { FunctionName: valid(i++) }
  const noVars = { FunctionName: valid(i++), Environment: {} }
  const noVer = { FunctionName: valid(i++), Environment: {} }
  const sameVer = {
    Environment: { Variables: { VERSION: (ver + 1).toString() } },
    FunctionName: valid(i++)
  }
  const newerVer = {
    Environment: { Variables: { VERSION: (ver + 2).toString() } },
    FunctionName: valid(i++)
  }
  const fn = valid(i)
  const olderVer = {
    Environment: { Variables: { VERSION: ver.toString(), CONCURRENCY: con } },
    FunctionName: fn
  }
  listFunctions.mockReturnValueOnce({
    promise: () => ({
      Functions: [
        noName,
        wrongName,
        noEnv,
        noVars,
        noVer,
        sameVer,
        newerVer,
        olderVer
      ],
      NextMarker: 1
    })
  })
  listFunctions.mockReturnValueOnce({ promise: () => ({ Functions: [] }) })
  latestCode.mockResolvedValue(c)
  updateFunctionCode.mockReturnValue({ promise: () => ({}) })
  updateFunctionConfiguration.mockReturnValue({
    promise: () => ({ FunctionArn: arn })
  })

  await expect(updateAll()).resolves.toEqual([{ arn }])

  expect(latestCode).toHaveBeenCalledTimes(1)
  expect(listFunctions).toHaveBeenCalledTimes(2)
  expect(listFunctions).toHaveBeenCalledWith({})
  expect(listFunctions).toHaveBeenCalledWith({ Marker: 1 })
  expect(updateFunctionCode).toHaveBeenCalledWith({
    FunctionName: fn,
    Publish: true,
    S3Bucket: c.bucket,
    S3Key: c.key
  })
  expect(updateFunctionConfiguration).toHaveBeenCalledWith({
    Environment: { Variables: { CONCURRENCY: con, VERSION: c.version } },
    FunctionName: fn,
    MemorySize: 256,
    Runtime: "nodejs8.10",
    Timeout: 32
  })
})
