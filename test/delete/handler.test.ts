import * as d from "../../src/delete/delete"

jest.mock("../../src/delete/delete")
const del = d.del as jest.Mock
import { handle } from "../../src/delete/handler"

describe("handler", () => {
  const evt = { consumerId: 123 }

  it("returns result", async () => {
    await expect(handle(evt)).resolves.toEqual({
      body: JSON.stringify({ success: true }),
      statusCode: 200,
    })

    expect(del).toHaveBeenCalledWith(evt.consumerId)
  })

  it("returns error on exception", async () => {
    const err = "my-error"
    del.mockRejectedValue(new Error(err))

    await expect(handle(evt)).resolves.toEqual({
      body: JSON.stringify({ error: err }),
      statusCode: 500,
    })

    expect(del).toHaveBeenCalledWith(evt.consumerId)
  })
})
