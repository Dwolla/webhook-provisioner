import * as c from "../../src/create/create"

jest.mock("../../src/create/create")
const create = c.create as jest.Mock
import { handle } from "../../src/create/handler"

describe("handler", () => {
  const evt = { consumerId: 123, concurrency: { reserved: 2, post: 5 } }

  it("returns result", async () => {
    const url = "url"
    create.mockResolvedValue(url)

    await expect(handle(evt)).resolves.toEqual({
      body: JSON.stringify({ queueUrl: url }),
      statusCode: 200
    })

    expect(create).toHaveBeenCalledWith(evt)
  })

  it("returns error on exception", async () => {
    const err = "my-error"
    create.mockRejectedValue(new Error(err))

    await expect(handle(evt)).resolves.toEqual({
      body: JSON.stringify({ error: err }),
      statusCode: 500
    })

    expect(create).toHaveBeenCalledWith(evt)
  })
})
