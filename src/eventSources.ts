import { log } from "@therockstorm/utils"
import Lambda, { EventSourceMappingConfiguration } from "aws-sdk/clients/lambda"
import { ConsumerId } from "."
import { lambdaName } from "./mapper"
import { retry } from "./util"

export const update = async (lam: Lambda, cId: ConsumerId, enabled: boolean) =>
  exec(lam, cId, async (uuid: string, state?: string) => {
    const inProgress =
      state &&
      (enabled
        ? state === "Enabled" || state === "Enabling"
        : state === "Disabled" || state === "Disabling")
    return inProgress
      ? (state as string)
      : await lam
          .updateEventSourceMapping({ UUID: uuid, Enabled: enabled })
          .promise()
  })

export const exec = async (
  lam: Lambda,
  cId: ConsumerId,
  fn: (
    uuid: string,
    state?: string
  ) => Promise<EventSourceMappingConfiguration | string>
): Promise<boolean> => {
  const es = await getEventSources(lam, cId)
  for (const e of es) {
    const uuid = e.UUID as string
    if (!uuid) continue
    log("Modifying event source", e)
    const res = await retry(async () => fn(uuid, e.State))
    log(res)
    return true
  }
  return false
}

const getEventSources = async (lam: Lambda, cId: ConsumerId) =>
  (
    await lam
      .listEventSourceMappings({ FunctionName: lambdaName(cId) })
      .promise()
  ).EventSourceMappings || []
