import Lambda from "aws-sdk/clients/lambda"
import * as mapper from "../src/mapper"

jest.mock("../src/mapper")
const lambdaName = mapper.lambdaName as jest.Mock
const listEventSourceMappings = jest.fn()
const updateEventSourceMapping = jest.fn()
const lam = {
  listEventSourceMappings,
  updateEventSourceMapping,
} as unknown as Lambda
import { update } from "../src/eventSources"

describe("update", () => {
  const cId = 123
  const ln = "ln"
  const id = "id"
  const um = { x: 1 }
  lambdaName.mockReturnValue(ln)
  const lm = (s: string) => ({ EventSourceMappings: [{ UUID: id, State: s }] })

  afterEach(() => updateEventSourceMapping.mockClear())

  it("returns true on update", async () => {
    const enabled = true
    listEventSourceMappings.mockReturnValue({ promise: () => lm("Creating") })
    updateEventSourceMapping.mockReturnValue({ promise: () => um })

    await expect(update(lam, cId, enabled)).resolves.toEqual(true)

    expect(listEventSourceMappings).toHaveBeenCalledWith({ FunctionName: ln })
    expect(updateEventSourceMapping).toHaveBeenCalledWith({
      Enabled: enabled,
      UUID: id,
    })
  })

  it("returns state if Enabling", async () => {
    listEventSourceMappings.mockReturnValue({ promise: () => lm("Enabling") })

    await expect(update(lam, cId, true)).resolves.toEqual(true)

    expect(updateEventSourceMapping).not.toHaveBeenCalled()
  })

  it("returns state if Enabled", async () => {
    listEventSourceMappings.mockReturnValue({ promise: () => lm("Enabled") })

    await expect(update(lam, cId, true)).resolves.toEqual(true)

    expect(updateEventSourceMapping).not.toHaveBeenCalled()
  })

  it("returns state if disabling", async () => {
    listEventSourceMappings.mockReturnValue({ promise: () => lm("Disabling") })

    await expect(update(lam, cId, false)).resolves.toEqual(true)

    expect(updateEventSourceMapping).not.toHaveBeenCalled()
  })

  it("returns state if Disabled", async () => {
    listEventSourceMappings.mockReturnValue({ promise: () => lm("Disabled") })

    await expect(update(lam, cId, false)).resolves.toEqual(true)

    expect(updateEventSourceMapping).not.toHaveBeenCalled()
  })
})
