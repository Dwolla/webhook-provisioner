import CloudWatch from "aws-sdk/clients/cloudwatch"
import SNS from "aws-sdk/clients/sns"
import * as mapper from "../../src/create/mapper"

jest.mock("aws-sdk/clients/cloudwatch")
jest.mock("aws-sdk/clients/sns")
jest.mock("../../src/create/mapper")
const cw = (CloudWatch as unknown) as jest.Mock
const sns = (SNS as unknown) as jest.Mock
const toLambdaErrorAlarm = mapper.toLambdaErrorAlarm as jest.Mock
const toLogErrorAlarm = mapper.toLogErrorAlarm as jest.Mock
const putMetricAlarm = jest.fn()
const createTopic = jest.fn()
cw.mockImplementationOnce(() => ({ putMetricAlarm }))
sns.mockImplementationOnce(() => ({ createTopic }))
import { createAlarms as cas } from "../../src/create/createAlarms"

test("createAlarms", async () => {
  const ta = "ta"
  const cId = 123
  const lamA = { x: 0 }
  const logA = { x: 1 }
  toLambdaErrorAlarm.mockReturnValue(lamA)
  toLogErrorAlarm.mockReturnValue(logA)
  createTopic.mockReturnValue({ promise: () => ({ TopicArn: ta }) })
  putMetricAlarm.mockReturnValue({ promise: () => ({}) })

  await expect(cas(cId)).resolves.toEqual(undefined)

  expect(toLambdaErrorAlarm).toHaveBeenCalledWith(cId, ta)
  expect(toLogErrorAlarm).toHaveBeenCalledWith(cId, ta)
  expect(putMetricAlarm).toHaveBeenCalledWith(lamA)
  expect(putMetricAlarm).toHaveBeenCalledWith(logA)
})
