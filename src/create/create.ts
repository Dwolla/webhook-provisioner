import { IConcurrencyEvent } from ".."
import { latestCode } from "../latestCode"
import {
  calculateFuncTimeout,
  validateConcurrency,
  calculateMaxRetries,
} from "../util"
import { createAlarms } from "./createAlarms"
import { createLambda } from "./createLambda"
import { createLogGroup } from "./createLogGroup"
import { createQueue } from "./createQueue"
import { createRole } from "./createRole"
import { enableExisting } from "./enableExisting"

export const create = async (evt: IConcurrencyEvent): Promise<string> => {
  const cId = evt.consumerId
  const maxRetries = calculateMaxRetries()
  const existingUrl = await enableExisting(cId)
  if (existingUrl) return existingUrl

  const concurrency = validateConcurrency(evt.concurrency)
  const timeout = calculateFuncTimeout(concurrency.post)
  // Could fail with QueueDeletedRecently, attempt it first
  const queues = await createQueue(cId, timeout)
  const [location, logGroup] = await Promise.all([
    latestCode(),
    createLogGroup(cId),
  ])
  const role = await createRole(cId, logGroup, queues)
  await createLambda({
    cId,
    concurrency,
    location,
    queues,
    role,
    timeout,
    maxRetries,
  })
  await createAlarms(cId)
  return queues.partner.url
}
