import { updateAll, updateByConsumerIds } from "../../src/updateCode/update"
import { validateUpdateConsumersCodeRequest } from "../../src/updateCode/util"
import {
  handle,
  updateConsumersCodeHandler,
} from "../../src/updateCode/handler"
import { when } from "jest-when"
import {
  UpdateConsumersCodeRequest,
  UpdateConsumersCodeResponse,
} from "../../src"
import { Context } from "aws-lambda"

jest.mock("../../src/updateCode/update")
jest.mock("../../src/updateCode/util")
const updateAllMock = jest.mocked(updateAll)
const updateByConsumerIdsMock = jest.mocked(updateByConsumerIds)
const validateUpdateConsumersCodeRequestMock = jest.mocked(
  validateUpdateConsumersCodeRequest
)

describe("handler", () => {
  afterEach(() => updateAllMock.mockClear())

  it("returns result", async () => {
    await expect(handle()).resolves.toEqual({
      body: JSON.stringify({ success: true }),
      statusCode: 200,
    })

    expect(updateAll).toHaveBeenCalledTimes(1)
  })

  it("returns error on exception", async () => {
    const err = "my-error"
    updateAllMock.mockRejectedValue(new Error(err))

    await expect(handle()).resolves.toEqual({
      body: JSON.stringify({ error: err }),
      statusCode: 500,
    })

    expect(updateAll).toHaveBeenCalledTimes(1)
  })
})

describe("updateByConsumersCodeHandler", () => {
  const context: Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: "test",
    functionVersion: "test",
    invokedFunctionArn: "test",
    memoryLimitInMB: "test",
    awsRequestId: "test",
    logGroupName: "test",
    logStreamName: "test",
    getRemainingTimeInMillis: jest.fn(),
    done: jest.fn(),
    fail: jest.fn(),
    succeed: jest.fn(),
  }

  const request: UpdateConsumersCodeRequest = {
    consumerIds: ["app1", 123],
    nodeVersion: "node-version",
    codeName: "code-name",
  }

  const successResponse: UpdateConsumersCodeResponse = {
    statusCode: 200,
    body: {
      message: "success",
    },
  }

  beforeEach(() => {
    when(validateUpdateConsumersCodeRequestMock)
      .calledWith(request)
      .mockReturnValue(request)

    when(updateByConsumerIdsMock)
      .calledWith(request)
      .mockResolvedValue(successResponse)
  })

  afterEach(() => {
    updateByConsumerIdsMock.mockClear()
    validateUpdateConsumersCodeRequestMock.mockClear()
  })

  test("should return error if validation error is present", async () => {
    const errorMessage = "validation error message"

    when(validateUpdateConsumersCodeRequestMock)
      .calledWith(request)
      .mockImplementationOnce(() => {
        throw new Error(errorMessage)
      })

    const expected: UpdateConsumersCodeResponse = {
      statusCode: 500,
      body: {
        message: errorMessage,
      },
    }

    const results = await updateConsumersCodeHandler(
      request,
      context,
      jest.fn()
    )

    expect(results).toEqual(expected)
    expect(updateByConsumerIds).toHaveBeenCalledTimes(0)
  })

  test("should return error if update function returned an error", async () => {
    const errorMessage = "update by consumer ids error"

    when(updateByConsumerIdsMock)
      .calledWith(request)
      .mockImplementationOnce(() => {
        throw new Error(errorMessage)
      })

    const expected: UpdateConsumersCodeResponse = {
      statusCode: 500,
      body: {
        message: errorMessage,
      },
    }

    const results = await updateConsumersCodeHandler(
      request,
      context,
      jest.fn()
    )

    expect(results).toEqual(expected)
    expect(updateByConsumerIds).toHaveBeenCalledTimes(1)
  })

  test("should return success if update function executed successfully", async () => {
    const results = await updateConsumersCodeHandler(
      request,
      context,
      jest.fn()
    )

    expect(results).toEqual(successResponse)
    expect(updateByConsumerIds).toHaveBeenCalledTimes(1)
  })
})
