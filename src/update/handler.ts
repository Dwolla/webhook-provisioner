import { log } from "@therockstorm/utils"
import "source-map-support/register"
import { IUpdateEvent, Res } from ".."
import { withErrHandling } from "../util"
import { update } from "./update"

export const handle = async (evt: IUpdateEvent): Promise<Res> => {
  log(JSON.stringify(evt))
  return await withErrHandling(async () => {
    await update(evt)
    return { success: true }
  })
}
