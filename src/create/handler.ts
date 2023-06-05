import "source-map-support/register"
import { IConcurrencyEvent, Res } from ".."
import { withErrHandling } from "../util"
import { create } from "./create"
import { log } from "../logger"

export const handle = async (evt: IConcurrencyEvent): Promise<Res> => {
  log(JSON.stringify(evt))
  return await withErrHandling(async () => ({ queueUrl: await create(evt) }))
}
