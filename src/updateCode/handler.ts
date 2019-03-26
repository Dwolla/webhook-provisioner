import "source-map-support/register"
import { Res } from ".."
import { withErrHandling } from "../util"
import { updateAll } from "./update"

export const handle = async (): Promise<Res> =>
  await withErrHandling(async () => {
    await updateAll()
    return { success: true }
  })
