import S3 from "aws-sdk/clients/s3"
import { Location } from "."
import { DEPLOYMENT_BUCKET, ENV, logRes } from "./util"

const s3 = new S3()

export const latestCode = async (): Promise<Location> =>
  await logRes<Location>("Getting latest code", async () => {
    const ps = {
      Bucket: DEPLOYMENT_BUCKET,
      Prefix: `serverless/webhook-handler/${ENV}/`
    }
    const err = new Error(`Code not in ${ps.Bucket}/${ps.Prefix}`)
    const contents = (await s3.listObjectsV2(ps).promise()).Contents
    if (!contents || !contents.length) throw err

    const filtered = contents
      .filter(c => c.Key && c.Key.includes("func.zip"))
      .map(c => c.Key as string)
      .sort((a, b) => (a > b ? -1 : 1))
    if (!filtered.length) throw err

    const key = filtered[0]
    return {
      bucket: ps.Bucket,
      key,
      version: key
        .split("/")[3]
        .split("-")
        .slice(1)
        .join("-")
    }
  })
