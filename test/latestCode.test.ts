import S3 from "aws-sdk/clients/s3"

jest.mock("aws-sdk/clients/s3")
const s3 = (S3 as unknown) as jest.Mock
const listObjectsV2 = jest.fn()
s3.mockImplementationOnce(() => ({ listObjectsV2 }))
import { latestCode } from "../src/latestCode"

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
    await expect(latestCode()).rejects.toEqual(err)
  })

  it("returns latestCode", async () => {
    const key = `${prefix}1549039293184-2019-02-01T16:41:33.184Z/func.zip`
    listObjectsV2.mockReturnValue({
      promise: () => ({ Contents: [{ Key: key }] }),
    })

    expect(await latestCode()).toEqual({
      bucket: "bucket",
      key,
      version: "2019-02-01T16:41:33.184Z",
    })
  })
})
