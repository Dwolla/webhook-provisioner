import { UpdateConsumersCodeRequest } from "../../src"
import { validateUpdateConsumersCodeRequest } from "../../src/updateCode/util"

describe("util", () => {
  describe("validateUpdateConsumersCodeRequest", () => {
    test("should throw an error if no consumers passed in", () => {
      const request = {} as UpdateConsumersCodeRequest
      const expected = new Error("Consumers array is empty or not provided")

      expect(() => validateUpdateConsumersCodeRequest(request)).toThrow(
        expected
      )
    })

    test("should throw an error if code name is not passed in", () => {
      const request = {
        consumerIds: [123, "app1"],
      } as UpdateConsumersCodeRequest
      const expected = new Error("Code name is empty or not provided")

      expect(() => validateUpdateConsumersCodeRequest(request)).toThrow(
        expected
      )
    })

    test("should return error if node version is not passed in", () => {
      const request = {
        consumerIds: [123, "app1"],
        codeName: "testName",
      } as UpdateConsumersCodeRequest
      const expected = new Error("Node version is empty or not provided")

      expect(() => validateUpdateConsumersCodeRequest(request)).toThrow(
        expected
      )
    })

    test("should return error if node version is not allowed", () => {
      const request = {
        consumerIds: [123, "app1"],
        codeName: "testName",
        nodeVersion: "nodejs18.x",
      } as UpdateConsumersCodeRequest
      const expected = new Error("Node version is not supported")

      expect(() => validateUpdateConsumersCodeRequest(request)).toThrow(
        expected
      )
    })

    test("should return valid UpdateConsumersCodeRequest", () => {
      const request = {
        consumerIds: [123, "app1"],
        codeName: "testName ",
        nodeVersion: "nodejs20.x ",
      }

      const expected = {
        consumerIds: [123, "app1"],
        codeName: "testName",
        nodeVersion: "nodejs20.x",
      }

      expect(validateUpdateConsumersCodeRequest(request)).toStrictEqual(
        expected
      )
    })
  })
})
