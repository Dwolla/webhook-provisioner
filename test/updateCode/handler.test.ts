import * as u from "../../src/updateCode/update"

jest.mock("../../src/updateCode/update")
const updateAll = u.updateAll as jest.Mock
import { handle } from "../../src/updateCode/handler"

describe("handler", () => {
  afterEach(() => updateAll.mockClear())

  it("returns result", async () => {
    await expect(handle()).resolves.toEqual({
      body: JSON.stringify({ success: true }),
      statusCode: 200,
    })

    expect(updateAll).toHaveBeenCalledTimes(1)
  })

  it("returns error on exception", async () => {
    const err = "my-error"
    updateAll.mockRejectedValue(new Error(err))

    await expect(handle()).resolves.toEqual({
      body: JSON.stringify({ error: err }),
      statusCode: 500,
    })

    expect(updateAll).toHaveBeenCalledTimes(1)
  })
})
