import { IConcurrency } from "../src"
import {
  calculateFuncTimeout,
  ignore404,
  validateConcurrency,
  withErrHandling
} from "../src/util"

describe("validateConcurrency", () => {
  const con = (concur: IConcurrency, expReserve: number, expPost: number) => {
    const c = validateConcurrency(concur)
    expect(c.reserved).toBe(expReserve)
    expect(c.post).toBe(expPost)
  }

  it("default if undefined", () => con({} as IConcurrency, 2, 5))
  it("set to minimum if 0", () => con({ reserved: 0, post: 0 }, 1, 1))
  it("set to max if too high", () => con({ reserved: 11, post: 11 }, 10, 10))
  it("return what was passed", () => con({ reserved: 8, post: 8 }, 8, 8))
})

describe("calculateFuncTimeout", () => {
  it("0", () => expect(calculateFuncTimeout(0)).toBe(112))
  it("1", () => expect(calculateFuncTimeout(1)).toBe(112))
  it("5", () => expect(calculateFuncTimeout(5)).toBe(32))
  it("10", () => expect(calculateFuncTimeout(10)).toBe(22))
  it("20", () => expect(calculateFuncTimeout(20)).toBe(22))
})

describe("ignore404", () => {
  const err = (c: string) => new MyError("msg", c)
  const reject = (c: string) => Promise.reject(err(c))

  it("returns if no error", async () => {
    const res = { x: 0 }
    await expect(ignore404(() => Promise.resolve(res))).resolves.toBe(res)
  })

  it("ignores ResourceNotFoundException", async () =>
    await expect(
      ignore404(() => reject("ResourceNotFoundException"))
    ).resolves.toEqual(undefined))

  it("ignores NoSuchEntity", async () =>
    await expect(ignore404(() => reject("NoSuchEntity"))).resolves.toEqual(
      undefined
    ))

  it("ignores NonExistentQueue", async () =>
    await expect(
      ignore404(() => reject("AWS.SimpleQueueService.NonExistentQueue"))
    ).resolves.toEqual(undefined))

  it("throws unexpected code", async () => {
    const c = "???"
    await expect(ignore404(() => reject(c))).rejects.toEqual(err(c))
  })

  it("throws undefined code", async () => {
    const e = new Error("msg")
    await expect(ignore404(() => Promise.reject(e))).rejects.toEqual(e)
  })
})

describe("withErrHandling", () => {
  it("returns res", async () => {
    const exp = { res: "my-res" }

    await expect(
      withErrHandling(async () => await Promise.resolve(exp))
    ).resolves.toEqual({
      body: JSON.stringify(exp),
      statusCode: 200
    })
  })

  it("returns error on exception", async () => {
    const err = "my-error"

    await expect(
      withErrHandling(async () => await Promise.reject(new Error(err)))
    ).resolves.toEqual({
      body: JSON.stringify({ error: err }),
      statusCode: 500
    })
  })

  it("returns unexpected error if no message", async () => {
    await expect(
      withErrHandling(async () => await Promise.reject(new Error()))
    ).resolves.toEqual({
      body: JSON.stringify({ error: "Unexpected error." }),
      statusCode: 500
    })
  })
})

class MyError extends Error {
  protected code: string

  constructor(message: string, code: string) {
    super(message)
    this.code = code
  }
}
