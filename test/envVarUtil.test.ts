import { envVarRequired } from "../src/envVarUtil"

describe("envVarRequired", () => {
  it("return environment value if it exists", () =>
    expect(envVarRequired("ENVIRONMENT")).toBe("test"))
  it("throw error if environment value does not exists", () =>
    expect(() => envVarRequired("EmptyVar")).toThrow(
      new Error(`EmptyVar required`)
    ))
})
