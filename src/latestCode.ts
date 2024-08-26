import S3, { ListObjectsV2Request } from "aws-sdk/clients/s3"
import { Location } from "."
import { DEPLOYMENT_BUCKET, ENV, logRes } from "./util"
import { log } from "./logger"
import { s3ToLocation } from "./mapper"

const s3 = new S3()

export const latestCode = async (): Promise<Location> =>
  await logRes<Location>("Getting latest code", async () => {
    const ps = {
      Bucket: DEPLOYMENT_BUCKET,
      Prefix: `serverless/webhook-handler/${ENV}/`,
    }
    const contents = await listObjects(ps)

    const sortedList = filterS3Objects(contents)
      .map((c) => c.Key as string)
      .sort((a, b) => (a > b ? -1 : 1))

    const key = sortedList[0]

    return s3ToLocation(ps.Bucket, key)
  })

export const codeExists = async (codeVersion: string): Promise<Location> => {
  const listRequest = {
    Bucket: DEPLOYMENT_BUCKET,
    Prefix: `serverless/webhook-handler/${ENV}/*-${codeVersion}/`,
  }

  const contents = await listObjects(listRequest)

  const filteredObjects = filterS3Objects(contents)

  if (filteredObjects.length !== 1) {
    throw new Error(
      `Unexpected number of code packages returned for code version: ${codeVersion}`
    )
  }

  const key = filteredObjects[0].Key
  if (!key) {
    throw new Error(`Key value was not returned from list s3 object`)
  }

  return s3ToLocation(listRequest.Bucket, key)
}

const listObjects = async (
  request: ListObjectsV2Request
): Promise<S3.ObjectList> => {
  log(`Listing s3 objects for ${request.Bucket}/${request.Prefix}`)
  const result = await s3.listObjectsV2(request).promise()
  const contents = result.Contents

  if (!contents?.length) {
    throw new Error(`Code not in ${request.Bucket}/${request.Prefix}`)
  }

  return contents
}

const filterS3Objects = (contents: S3.ObjectList): S3.Object[] => {
  const filteredList = contents.filter((c) => c?.Key?.includes("func.zip"))

  if (!filteredList.length) {
    throw new Error(`Filtered s3 list returned 0 matches`)
  }

  return filteredList
}
