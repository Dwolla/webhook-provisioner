import * as u from "../../src/update/update"

jest.mock("../../src/update/update")
const update = u.update as jest.Mock
import { handle } from "../../src/update/handler"

describe("handler", () => {
  const evt = { consumerIds: [123], concurrency: { reserved: 2, post: 5 } }

  it("returns result", async () => {
    await expect(handle(evt)).resolves.toEqual({
      body: JSON.stringify({ success: true }),
      statusCode: 200
    })

    expect(update).toHaveBeenCalledWith(evt)
  })

  it("returns error on exception", async () => {
    const err = "my-error"
    update.mockRejectedValue(new Error(err))

    await expect(handle(evt)).resolves.toEqual({
      body: JSON.stringify({ error: err }),
      statusCode: 500
    })

    expect(update).toHaveBeenCalledWith(evt)
  })
})
