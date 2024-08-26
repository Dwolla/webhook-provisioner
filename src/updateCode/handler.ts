import "source-map-support/register"
import {
  Res,
  UpdateConsumersCodeHandler,
  UpdateConsumersCodeRequest,
  UpdateConsumersCodeResponse,
} from ".."
import { error, log } from "../logger"
import { withErrHandling } from "../util"
import { updateAll, updateByConsumerIds } from "./update"
import { validateUpdateConsumersCodeRequest } from "./util"

export const handle = async (): Promise<Res> =>
  await withErrHandling(async () => {
    await updateAll()
    return { success: true }
  })

export const updateConsumersCodeHandler: UpdateConsumersCodeHandler = async (
  request: UpdateConsumersCodeRequest
): Promise<UpdateConsumersCodeResponse> => {
  try {
    log("Request received", request)
    const validRequest = validateUpdateConsumersCodeRequest(request)
    return updateByConsumerIds(validRequest)
  } catch (e: any) {
    error(
      `Error returned during processing handling, errorMessage=${e.message}`
    )
    return {
      statusCode: 500,
      body: {
        message: e.message,
      },
    }
  }
}
