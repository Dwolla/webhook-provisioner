import Lambda from "aws-sdk/clients/lambda"
import * as lc from "../../src/latestCode"

jest.mock("aws-sdk/clients/lambda")
jest.mock("../../src/latestCode")
const updateFunctionCode = jest.fn()
const updateFunctionConfiguration = jest.fn()
const listFunctions = jest.fn()
const waitFor = jest.fn()
const lam = Lambda as unknown as jest.Mock
lam.mockImplementationOnce(() => ({
  listFunctions,
  updateFunctionCode,
  updateFunctionConfiguration,
  waitFor,
}))
const latestCode = lc.latestCode as jest.Mock
import { updateAll } from "../../src/updateCode/update"

test("update", async () => {
  const resourceName = "a"
  const concurrency = "5"
  const ver = 1
  const configurationRequest = {
    bucket: "b",
    key: "k",
    version: (ver + 1).toString(),
  }
  const validLambdaName = (n: number) => `webhooks-${n}-lambda-test`
  const validLambdaNameWithApplicationId = (n: number) =>
    `webhooks-app${n}-lambda-test`
  let i = 0
  const noName = { Environment: { Variables: { VERSION: ver.toString() } } }
  const wrongName = {
    Environment: { Variables: { VERSION: ver.toString() } },
    FunctionName: "function-name",
  }
  const noEnv = { FunctionName: validLambdaName(i++) }
  const noVars = { FunctionName: validLambdaName(i++), Environment: {} }
  const noVer = { FunctionName: validLambdaName(i++), Environment: {} }
  const sameVer = {
    Environment: { Variables: { VERSION: (ver + 1).toString() } },
    FunctionName: validLambdaName(i++),
  }
  const newerVer = {
    Environment: { Variables: { VERSION: (ver + 2).toString() } },
    FunctionName: validLambdaName(i++),
  }
  const functionName = validLambdaName(i)
  const olderVer = {
    Environment: {
      Variables: { VERSION: ver.toString(), CONCURRENCY: concurrency },
    },
    FunctionName: functionName,
  }

  const stringFunctionName = validLambdaNameWithApplicationId(i++)
  const olderVersWithString = {
    Environment: {
      Variables: { VERSION: ver.toString(), CONCURRENCY: concurrency },
    },
    FunctionName: stringFunctionName,
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
        olderVer,
        olderVersWithString,
      ],
      NextMarker: 1,
    }),
  })
  listFunctions.mockReturnValueOnce({ promise: () => ({ Functions: [] }) })
  latestCode.mockResolvedValue(configurationRequest)
  updateFunctionCode.mockReturnValue({ promise: () => ({}) })
  waitFor.mockReturnValue({ promise: () => ({}) })
  updateFunctionConfiguration.mockReturnValue({
    promise: () => ({ FunctionArn: resourceName }),
  })

  await expect(updateAll()).resolves.toEqual([
    { arn: resourceName },
    { arn: resourceName },
  ])

  expect(latestCode).toHaveBeenCalledTimes(1)
  expect(listFunctions).toHaveBeenCalledTimes(2)
  expect(listFunctions).toHaveBeenCalledWith({})
  expect(listFunctions).toHaveBeenCalledWith({ Marker: 1 })
  expect(updateFunctionCode).toHaveBeenCalledWith({
    FunctionName: functionName,
    Publish: true,
    S3Bucket: configurationRequest.bucket,
    S3Key: configurationRequest.key,
  })
  expect(updateFunctionCode).toHaveBeenCalledWith({
    FunctionName: stringFunctionName,
    Publish: true,
    S3Bucket: configurationRequest.bucket,
    S3Key: configurationRequest.key,
  })
  expect(waitFor).toHaveBeenCalledTimes(2)
  expect(waitFor).toHaveBeenCalledWith("functionUpdatedV2", {
    FunctionName: functionName,
  })
  expect(waitFor).toHaveBeenCalledWith("functionUpdatedV2", {
    FunctionName: stringFunctionName,
  })
  expect(updateFunctionConfiguration).toHaveBeenCalledWith({
    Environment: {
      Variables: {
        CONCURRENCY: concurrency,
        VERSION: configurationRequest.version,
      },
    },
    FunctionName: functionName,
    MemorySize: 128,
    Runtime: "nodejs20.x",
    Timeout: 32,
  })
  expect(updateFunctionConfiguration).toHaveBeenCalledWith({
    Environment: {
      Variables: {
        CONCURRENCY: concurrency,
        VERSION: configurationRequest.version,
      },
    },
    FunctionName: stringFunctionName,
    MemorySize: 128,
    Runtime: "nodejs20.x",
    Timeout: 32,
  })
})
