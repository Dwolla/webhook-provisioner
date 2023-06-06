import { log } from "../logger"
import "source-map-support/register"
import { IEvent, Res } from ".."
import { withErrHandling } from "../util"
import { del } from "./delete"

export const handle = async (evt: IEvent): Promise<Res> => {
  log(JSON.stringify(evt))
  return await withErrHandling(async () => {
    await del(evt.consumerId)
    return { success: true }
  })
}
