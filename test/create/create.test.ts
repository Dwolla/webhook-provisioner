import { createAlarms } from "../../src/create/createAlarms"
import { createLambda } from "../../src/create/createLambda"
import { createLogGroup } from "../../src/create/createLogGroup"
import { createQueue } from "../../src/create/createQueue"
import { createRole } from "../../src/create/createRole"
import { latestCode } from "../../src/latestCode"
import { enableExisting } from "../../src/create/enableExisting"

jest.mock("../../src/latestCode")
jest.mock("../../src/create/createAlarms")
jest.mock("../../src/create/createQueue")
jest.mock("../../src/create/createLambda")
jest.mock("../../src/create/createLogGroup")
jest.mock("../../src/create/createRole")
jest.mock("../../src/create/enableExisting")
const enableExistingMock = jest.mocked(enableExisting)
const latestCodeMock = jest.mocked(latestCode)
const createAlarmsMock = jest.mocked(createAlarms)
const createQueueMock = jest.mocked(createQueue)
const createLambdaMock = jest.mocked(createLambda)
const createLogGroupMock = jest.mocked(createLogGroup)
const createRoleMock = jest.mocked(createRole)
import { create } from "../../src/create/create"
import { when } from "jest-when"

describe("create", () => {
  test("should enable exit after enabling existing resource", async () => {
    const createEvent = {
      consumerId: 123,
      concurrency: { reserved: 2, post: 5 },
    }

    const expected = "existingUrl"

    when(enableExistingMock)
      .calledWith(createEvent.consumerId)
      .mockResolvedValue(expected)

    await expect(create(createEvent)).resolves.toEqual(expected)

    expect(latestCodeMock).toHaveBeenCalledTimes(0)
    expect(createQueueMock).toHaveBeenCalledTimes(0)
    expect(createLogGroupMock).toHaveBeenCalledTimes(0)
    expect(createRoleMock).toHaveBeenCalledTimes(0)
    expect(createLambdaMock).toHaveBeenCalledTimes(0)
    expect(createAlarmsMock).toHaveBeenCalledTimes(0)
  })

  test("should create new resources if they don't exist", async () => {
    const createEvent = {
      consumerId: 123,
      concurrency: { reserved: 2, post: 5 },
    }

    const timeout = 32
    const maxRetries = 8

    when(enableExistingMock)
      .calledWith(createEvent.consumerId)
      .mockResolvedValue(undefined)

    const queues = {
      partner: { url: "partnerUrl", arn: "partnerArn" },
      result: { url: "resultUrl", arn: "resultArn" },
      error: { url: "errorUrl", arn: "errorArn" },
    }
    when(createQueueMock)
      .calledWith(createEvent.consumerId, timeout)
      .mockResolvedValue(queues)

    const latestCodeDetails = {
      bucket: "codeBucket",
      key: "codeKey",
      version: "codeVersion",
    }
    when(latestCodeMock).mockResolvedValue(latestCodeDetails)

    const logGroup = { arn: "logGroupArn" }
    createLogGroupMock.mockResolvedValue(logGroup)

    const roleResource = {
      roleArn: "roleArn",
      roleName: "roleName",
      policyArn: "policyArn",
    }
    when(createRoleMock).mockResolvedValue(roleResource)

    const createLambdaResponse = {
      arn: "lambdaArn",
      eventSourceId: "EventSource",
    }
    createLambdaMock.mockResolvedValue(createLambdaResponse)

    createAlarmsMock.mockResolvedValue()

    await expect(create(createEvent)).resolves.toEqual(queues.partner.url)

    expect(latestCode).toHaveBeenCalledTimes(1)
    expect(createQueue).toHaveBeenCalledTimes(1)
    expect(createQueue).toHaveBeenCalledWith(createEvent.consumerId, timeout)
    expect(createLogGroup).toHaveBeenCalledWith(createEvent.consumerId)
    expect(createRole).toHaveBeenCalledWith(
      createEvent.consumerId,
      logGroup,
      queues
    )
    expect(createLambda).toHaveBeenCalledWith({
      cId: createEvent.consumerId,
      concurrency: createEvent.concurrency,
      location: latestCodeDetails,
      queues: queues,
      role: roleResource,
      timeout: timeout,
      maxRetries: maxRetries,
    })
    expect(createAlarms).toHaveBeenCalledWith(createEvent.consumerId)
  })
})
