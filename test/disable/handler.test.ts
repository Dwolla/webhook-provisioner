import * as d from "../../src/disable/disable"

jest.mock("../../src/disable/disable")
const disable = d.disable as jest.Mock
import { handle } from "../../src/disable/handler"

describe("handler", () => {
  const evt = { consumerId: 123 }

  it("returns result", async () => {
    await expect(handle(evt)).resolves.toEqual({
      body: JSON.stringify({ success: true }),
      statusCode: 200
    })

    expect(disable).toHaveBeenCalledWith(evt)
  })

  it("returns error on exception", async () => {
    const err = "my-error"
    disable.mockRejectedValue(new Error(err))

    await expect(handle(evt)).resolves.toEqual({
      body: JSON.stringify({ error: err }),
      statusCode: 500
    })

    expect(disable).toHaveBeenCalledWith(evt)
  })
})
