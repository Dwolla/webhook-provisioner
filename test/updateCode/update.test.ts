import Lambda from "aws-sdk/clients/lambda"
import { codeExists, latestCode } from "../../src/latestCode"
import { getLambdaEnvVars } from "../../src/lambdaHelpers"
import { Location } from "../../src"

jest.mock("aws-sdk/clients/lambda")
jest.mock("../../src/latestCode")
jest.mock("../../src/lambdaHelpers")

const updateFunctionCode = jest.fn()
const updateFunctionConfiguration = jest.fn()
const listFunctions = jest.fn()
const waitFor = jest.fn()
const lam = Lambda as unknown as jest.Mock
lam.mockImplementation(() => ({
  listFunctions,
  updateFunctionCode,
  updateFunctionConfiguration,
  waitFor,
}))
const latestCodeMock = jest.mocked(latestCode)
const codeExistsMock = jest.mocked(codeExists)
const getLambdaEnvVarsMock = jest.mocked(getLambdaEnvVars)

import { updateAll, updateByConsumerIds } from "../../src/updateCode/update"
import { ConsumerId, UpdateConsumersCodeRequest } from "../../src"
import { when } from "jest-when"

const validLambdaName = (n: ConsumerId) => `webhooks-${n}-lambda-test`
const validLambdaNameWithApplicationId = (n: ConsumerId) =>
  `webhooks-app${n}-lambda-test`
const concurrency = "5"

test("update", async () => {
  const resourceName = "a"
  const ver = 1
  const configurationRequest = {
    bucket: "b",
    key: "k",
    version: (ver + 1).toString(),
  }

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
  latestCodeMock.mockResolvedValue(configurationRequest)
  updateFunctionCode.mockReturnValue({ promise: () => ({}) })
  waitFor.mockReturnValue({ promise: () => ({}) })
  updateFunctionConfiguration.mockReturnValue({
    promise: () => ({ FunctionArn: resourceName }),
  })

  await expect(updateAll()).resolves.toEqual([
    { arn: resourceName, name: functionName },
    { arn: resourceName, name: stringFunctionName },
  ])

  expect(latestCodeMock).toHaveBeenCalledTimes(1)
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

describe("updateByConsumerIds", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  const codeName = "2024-08-27T16:41:33.184Z"
  const request: UpdateConsumersCodeRequest = {
    codeName: codeName,
    nodeVersion: "nodejs20.x",
    consumerIds: [1, "app2"],
  }

  const initCodeLocationMock = (codeName: string) => {
    const codeLocation = {
      bucket: "bucket",
      key: `startingLocation/123456789-${codeName}/func.zip`,
      version: codeName,
    }

    when(codeExistsMock).calledWith(codeName).mockResolvedValue(codeLocation)

    return codeLocation
  }

  when(getLambdaEnvVarsMock)
    .calledWith(validLambdaName(request.consumerIds[0]))
    .mockResolvedValue({
      VERSION: codeName,
      ENVIRONMENT: "local",
      CONCURRENCY: concurrency,
    })

  when(getLambdaEnvVarsMock)
    .calledWith(validLambdaName(request.consumerIds[1]))
    .mockResolvedValue({
      VERSION: codeName,
      ENVIRONMENT: "local",
      CONCURRENCY: concurrency,
    })

  test("should throw an error is code version does not exists", async () => {
    initCodeLocationMock(codeName)
    const expected = new Error("Error with code exists")
    when(codeExistsMock)
      .calledWith(request.codeName)
      .mockRejectedValueOnce(expected)

    await expect(updateByConsumerIds(request)).rejects.toBe(expected)
  })

  test("should throw an error if lambda details can not be found for 1 consumer", async () => {
    initCodeLocationMock(codeName)
    const expected = new Error("Error getting lambda details")

    when(getLambdaEnvVarsMock)
      .calledWith(validLambdaName(request.consumerIds[1]))
      .mockRejectedValueOnce(expected)

    await expect(updateByConsumerIds(request)).rejects.toBe(expected)
  })

  test("should return success if no lambdas need updated", async () => {
    initCodeLocationMock(codeName)
    const expected = {
      statusCode: 200,
      body: {
        message: "Completed, verify logs for individual handler updates",
      },
    }

    const results = await updateByConsumerIds(request)
    expect(results).toEqual(expected)
    expect(updateFunctionCode).toHaveBeenCalledTimes(0)
    expect(updateFunctionConfiguration).toHaveBeenCalledTimes(0)
    expect(waitFor).toHaveBeenCalledTimes(0)
  })

  const initMocks = (id: ConsumerId, codeLocation: Location) => {
    const lambdaName = validLambdaName(id)
    when(updateFunctionCode)
      .calledWith({
        FunctionName: lambdaName,
        Publish: true,
        S3Bucket: codeLocation.bucket,
        S3Key: codeLocation.key,
      })
      .mockReturnValue({ promise: () => ({}) })

    when(waitFor)
      .calledWith("functionUpdatedV2", {
        FunctionName: lambdaName,
      })
      .mockReturnValue({ promise: () => ({}) })

    when(updateFunctionConfiguration)
      .calledWith({
        Environment: {
          Variables: {
            VERSION: codeLocation.version,
            Environment: "local",
            CONCURRENCY: concurrency,
          },
        },
        FunctionName: lambdaName,
        MemorySize: 128,
        Runtime: request.nodeVersion,
        Timeout: 32,
      })
      .mockReturnValue({
        promise: () => Promise.resolve({ FunctionArn: lambdaName }),
      })
  }
  test("should update versions that don't match", async () => {
    const codeName = "2024-08-28T16:41:33.184Z"
    const codeLocation = initCodeLocationMock(codeName)
    initMocks(request.consumerIds[0], codeLocation)
    initMocks(request.consumerIds[1], codeLocation)
    const result = await updateByConsumerIds({ ...request, codeName: codeName })

    expect(result).toEqual({
      statusCode: 200,
      body: {
        message: "Completed, verify logs for individual handler updates",
      },
    })

    expect(updateFunctionCode).toHaveBeenCalledTimes(2)
    expect(waitFor).toHaveBeenCalledTimes(2)
    expect(updateFunctionConfiguration).toHaveBeenCalledTimes(2)
  })
})
