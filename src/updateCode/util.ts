import { UpdateConsumersCodeRequest } from "../index"

const validateUpdateConsumersCodeRequest = (
  request: UpdateConsumersCodeRequest
): UpdateConsumersCodeRequest => {
  if (!Array.isArray(request.consumerIds) || request.consumerIds.length === 0) {
    throw new Error("Consumers array is empty or not provided")
  }

  if (!request.codeName || request.codeName.trim() === "") {
    throw new Error("Code name is empty or not provided")
  }

  if (!request.nodeVersion || request.nodeVersion.trim() === "") {
    throw new Error("Node version is empty or not provided")
  }

  const validNodeVersions = ["nodejs16.x", "nodejs20.x"]
  if (!validNodeVersions.includes(request.nodeVersion.trim())) {
    throw new Error("Node version is not supported")
  }

  return {
    consumerIds: request.consumerIds,
    codeName: request.codeName.trim(),
    nodeVersion: request.nodeVersion.trim(),
  }
}

export { validateUpdateConsumersCodeRequest }
