import asyncRetry from "async-retry"
import { AWSError } from "aws-sdk"
import { IConcurrency, Res } from "."
import { toRes } from "./mapper"
import { error, log, warn } from "./logger"
import { envVarRequired } from "./envVarUtil"

export const BATCH = 10
export const DEPLOYMENT_BUCKET = envVarRequired("DEPLOYMENT_BUCKET")
export const ENV = envVarRequired("ENVIRONMENT")
export const PROJECT = "webhooks"
export const REGION = process.env.AWS_REGION || "us-west-2"
const HTTP_TIMEOUT = 10
const QUEUE_SEND_TIMEOUT = 5
const MISC_TIMEOUT = 2
const RETRIES_MAX = envVarRequired("RETRIES_MAX")

export const validateConcurrency = (con: IConcurrency) => {
  con.reserved = validate(con.reserved, 1, 10, 2)
  con.post = validate(con.post, 1, BATCH, 5)
  return con
}

export const calculateFuncTimeout = (postCon: number | string): number => {
  const con = typeof postCon === "number" ? postCon : parseInt(postCon, 10)
  const serialApiReqs = Math.ceil(BATCH / Math.min(con || 1, BATCH))
  return HTTP_TIMEOUT * serialApiReqs + QUEUE_SEND_TIMEOUT * 2 + MISC_TIMEOUT
}

export const calculateMaxRetries = () => {
  return parseInt(RETRIES_MAX || "8", 10)
}

export async function ignore404<T>(
  fn: () => Promise<T>
): Promise<T | undefined> {
  const is404 = (c: string) =>
    c &&
    (c === "ResourceNotFoundException" ||
      c === "NoSuchEntity" ||
      c === "AWS.SimpleQueueService.NonExistentQueue")

  try {
    return await fn()
  } catch (e: any) {
    if (is404(e.code)) {
      warn(e.message)
      return
    }
    throw e
  }
}

export async function logRes<T>(m: string, fn: () => Promise<T>) {
  log(m)
  const res = await fn()
  log(res)
  return res
}

export async function retry<T>(fn: () => Promise<T>): Promise<T> {
  return await asyncRetry<T>(
    async (_, attempt) => {
      try {
        return await fn()
      } catch (err: any) {
        warn(msg(err, { attempt }))
        throw err // Will retry
      }
    },
    // Terraform handles this similarly, https://github.com/hashicorp/terraform/pull/4316/files
    { maxTimeout: 5000, minTimeout: 5000, retries: 15 }
  )
}

export const withErrHandling = async (
  bodyFunc: () => Promise<object>
): Promise<Res> => {
  try {
    return toRes(await bodyFunc())
  } catch (err: any) {
    const c = err.code ? `${err.code}: ` : ""
    c.includes("QueueDeletedRecently") ? warn(msg(err)) : error(err)
    return toRes({ error: `${c}${err.message || "Unexpected error."}` }, 500)
  }
}

const validate = (n: number, min: number, max: number, def: number) => {
  if (typeof n === "undefined") return def
  if (n < min) return min
  if (n > max) return max
  return n
}

const msg = (err: AWSError, other?: { [k: string]: any }) => ({
  code: err.code,
  message: err.message,
  ...other,
})
