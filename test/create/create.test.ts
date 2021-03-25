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
  const evt = { consumerId: 123, concurrency: { reserved: 2, post: 5 } }
  const to = 32
  const c = { x: 0 }
  const lg = { x: 1 }
  const qs = {
    partner: { url: "pu", arn: "p" },
    result: { url: "ru", arn: "a" },
  }
  const rl = { x: 3 }
  const cas = { x: 4 }
  const rm = 8
  latestCode.mockResolvedValue(c)
  createQueue.mockResolvedValue(qs)
  createLogGroup.mockResolvedValue(lg)
  createRole.mockResolvedValue(rl)
  createLambda.mockResolvedValue({})
  createAlarms.mockResolvedValue(cas)

  await expect(create(evt)).resolves.toEqual(qs.partner.url)

  expect(latestCode).toHaveBeenCalledTimes(1)
  expect(createQueue).toHaveBeenCalledTimes(1)
  expect(createQueue).toHaveBeenCalledWith(evt.consumerId, to)
  expect(createLogGroup).toHaveBeenCalledWith(evt.consumerId)
  expect(createRole).toHaveBeenCalledWith(evt.consumerId, lg, qs)
  expect(createLambda).toHaveBeenCalledWith({
    cId: evt.consumerId,
    concurrency: evt.concurrency,
    location: c,
    queues: qs,
    role: rl,
    timeout: to,
    maxRetries: rm,
  })
  expect(createAlarms).toHaveBeenCalledWith(evt.consumerId)
})
