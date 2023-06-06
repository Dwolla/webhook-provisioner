import { log } from "../logger"
import "source-map-support/register"
import { IDisableEvent, Res } from ".."
import { withErrHandling } from "../util"
import { disable } from "./disable"

export const handle = async (evt: IDisableEvent): Promise<Res> => {
  log(JSON.stringify(evt))
  return await withErrHandling(async () => {
    await disable(evt)
    return { success: true }
  })
}
