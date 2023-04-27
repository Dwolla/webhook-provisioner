import * as ca from "../../src/create/createAlarms"
import * as cl from "../../src/create/createLambda"
import * as clg from "../../src/create/createLogGroup"
import * as cq from "../../src/create/createQueue"
import * as cr from "../../src/create/createRole"
import * as lc from "../../src/latestCode"

jest.mock("../../src/latestCode")
jest.mock("../../src/create/createAlarms")
jest.mock("../../src/create/createQueue")
jest.mock("../../src/create/createLambda")
jest.mock("../../src/create/createLogGroup")
jest.mock("../../src/create/createRole")
jest.mock("../../src/create/enableExisting")
const latestCode = lc.latestCode as jest.Mock
const createAlarms = ca.createAlarms as jest.Mock
const createQueue = cq.createQueue as jest.Mock
const createLambda = cl.createLambda as jest.Mock
const createLogGroup = clg.createLogGroup as jest.Mock
const createRole = cr.createRole as jest.Mock
import { create } from "../../src/create/create"

test("create", async () => {
  const createEvent = { consumerId: 123, concurrency: { reserved: 2, post: 5 } }
  const timeout = 32
  const lCode = { x: 0 }
  const logGroup = { x: 1 }
  const queues = {
    partner: { url: "pu", arn: "p" },
    result: { url: "ru", arn: "a" },
  }
  const roleResource = { x: 3 }
  const createAlarmsResponse = { x: 4 }
  const maxRetries = 8
  latestCode.mockResolvedValue(lCode)
  createQueue.mockResolvedValue(queues)
  createLogGroup.mockResolvedValue(logGroup)
  createRole.mockResolvedValue(roleResource)
  createLambda.mockResolvedValue({})
  createAlarms.mockResolvedValue(createAlarmsResponse)

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
    location: lCode,
    queues: queues,
    role: roleResource,
    timeout: timeout,
    maxRetries: maxRetries,
  })
  expect(createAlarms).toHaveBeenCalledWith(createEvent.consumerId)
})
