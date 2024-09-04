import S3 from "aws-sdk/clients/s3"
import { s3ToLocation } from "../src/mapper"

jest.mock("aws-sdk/clients/s3")
jest.mock("../src/mapper")
const s3 = S3 as unknown as jest.Mock
const listObjectsV2 = jest.fn()
s3.mockImplementationOnce(() => ({ listObjectsV2 }))

const s3toLocationMock = jest.mocked(s3ToLocation)

import { codeExists, latestCode } from "../src/latestCode"
import { when } from "jest-when"

describe("latestCode", () => {
  const prefix = "serverless/webhook-handler/test/"
  const err = new Error(`Code not in bucket/${prefix}`)
  it("throws error if no contents", async () => {
    listObjectsV2.mockReturnValue({ promise: () => ({}) })
    await expect(latestCode()).rejects.toEqual(err)
  })

  it("throws error if empty contents", async () => {
    listObjectsV2.mockReturnValue({ promise: () => ({ Contents: [] }) })
    await expect(latestCode()).rejects.toEqual(err)
  })

  it("throws error if empty after filter", async () => {
    listObjectsV2.mockReturnValue({
      promise: () => ({ Contents: [{ Key: "" }] }),
    })
    await expect(latestCode()).rejects.toEqual(
      new Error(`Filtered s3 list returned 0 matches`)
    )
  })

  it("returns latestCode", async () => {
    const key = `${prefix}1549039293184-2019-02-01T16:41:33.184Z/func.zip`
    listObjectsV2.mockReturnValue({
      promise: () => ({ Contents: [{ Key: key }] }),
    })

    const expected = {
      bucket: "bucket",
      key,
      version: "2019-02-01T16:41:33.184Z",
    }

    when(s3toLocationMock).calledWith("bucket", key).mockReturnValue(expected)

    expect(await latestCode()).toEqual(expected)
  })
})

describe("codeExists", () => {
  const bucket = "bucket"
  const codeVersion = "1549039293184-2024-08-27T16:41:33.184Z"
  const prefix = `serverless/webhook-handler/test/${codeVersion}/`
  const prefixMatch = `serverless/webhook-handler/test/${codeVersion}/`

  test("returns true if code location if it exists", async () => {
    const key = `${prefix}func.zip`

    const expected = {
      bucket: bucket,
      key,
      version: codeVersion,
    }

    listObjectsV2.mockReturnValue({
      promise: () => ({ Contents: [{ Key: key }] }),
    })

    when(s3toLocationMock).calledWith(bucket, key).mockReturnValue(expected)

    expect(await codeExists(codeVersion)).toEqual(expected)
  })

  test("throw an error if list objects returns no objects", async () => {
    const expected = new Error(`Code not in ${bucket}/${prefixMatch}`)

    listObjectsV2.mockReturnValue({ promise: () => ({ Contents: [] }) })
    await expect(codeExists(codeVersion)).rejects.toEqual(expected)
  })

  test("throw an error if filtered objects returns no objects", async () => {
    const expected = new Error(`Filtered s3 list returned 0 matches`)

    listObjectsV2.mockReturnValue({
      promise: () => ({ Contents: [{ Key: "BadMatch" }] }),
    })
    await expect(codeExists(codeVersion)).rejects.toEqual(expected)
  })

  test("throw an error if multiple filtered objects are returned", async () => {
    const expected = new Error(
      `Unexpected number of code packages returned for code version: ${codeVersion}`
    )

    listObjectsV2.mockReturnValue({
      promise: () => ({
        Contents: [{ Key: "test1/func.zip" }, { Key: "test2/func.zip" }],
      }),
    })
    await expect(codeExists(codeVersion)).rejects.toStrictEqual(expected)
  })
})
