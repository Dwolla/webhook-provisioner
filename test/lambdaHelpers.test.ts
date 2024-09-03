import Lambda from "aws-sdk/clients/lambda"
import { when } from "jest-when"

jest.mock("aws-sdk/clients/lambda")
const lambdaMock = Lambda as unknown as jest.Mock
const getFunctionConfigurationMock = jest.fn()
lambdaMock.mockImplementationOnce(() => ({
  getFunctionConfiguration: getFunctionConfigurationMock,
}))
import { getLambdaEnvVars } from "../src/lambdaHelpers"

describe("lambdaHelpers", () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe("getLambdaEnvVars", () => {
    it("should return existing env vars", async () => {
      const request = "functionName"
      const envVariables: Lambda.EnvironmentResponse = {
        Variables: {
          TEST_VAR: "test-value",
        },
      }

      when(getFunctionConfigurationMock)
        .calledWith({ FunctionName: request })
        .mockReturnValue({
          promise: () => Promise.resolve({ Environment: envVariables }),
        })

      const envVars = await getLambdaEnvVars(request)

      expect(envVars).toEqual(envVariables.Variables)
      expect(getFunctionConfigurationMock).toBeCalledTimes(1)
    })

    it("should return empty env vars returned from lambda", async () => {
      const request = "functionName"
      const envVariables: Lambda.EnvironmentResponse = {
        Variables: {},
      }

      when(getFunctionConfigurationMock)
        .calledWith({ FunctionName: request })
        .mockReturnValue({
          promise: () => Promise.resolve({ Environment: envVariables }),
        })

      const envVars = await getLambdaEnvVars(request)

      expect(envVars).toEqual(envVariables.Variables)
      expect(getFunctionConfigurationMock).toBeCalledTimes(1)
    })

    it("should return default env vars if none returned from lambda request", async () => {
      const request = "functionName"
      const envVariables: Lambda.EnvironmentResponse = {}

      when(getFunctionConfigurationMock)
        .calledWith({ FunctionName: request })
        .mockReturnValue({
          promise: () => Promise.resolve({ Environment: envVariables }),
        })

      const envVars = await getLambdaEnvVars(request)

      expect(envVars).toEqual({})
      expect(getFunctionConfigurationMock).toBeCalledTimes(1)
    })

    it("should return default env vars if environment is not returned", async () => {
      const request = "functionName"

      when(getFunctionConfigurationMock)
        .calledWith({ FunctionName: request })
        .mockReturnValue({ promise: () => Promise.resolve({}) })

      const envVars = await getLambdaEnvVars(request)

      expect(envVars).toEqual({})
      expect(getFunctionConfigurationMock).toBeCalledTimes(1)
    })
  })
})
