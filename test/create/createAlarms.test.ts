import CloudWatch from "aws-sdk/clients/cloudwatch"
import SNS from "aws-sdk/clients/sns"
import * as mapper from "../../src/create/mapper"

jest.mock("aws-sdk/clients/cloudwatch")
jest.mock("aws-sdk/clients/sns")
jest.mock("../../src/create/mapper")
const cw = CloudWatch as unknown as jest.Mock
const sns = SNS as unknown as jest.Mock
const toLambdaErrorAlarm = mapper.toLambdaErrorAlarm as jest.Mock
const toLogErrorAlarm = mapper.toLogErrorAlarm as jest.Mock
const putMetricAlarm = jest.fn()
const createTopic = jest.fn()
cw.mockImplementationOnce(() => ({ putMetricAlarm }))
sns.mockImplementationOnce(() => ({ createTopic }))
import { createAlarms as cas } from "../../src/create/createAlarms"

test("createAlarms", async () => {
  const alarmTopicName = "ta"
  const consumerId = 123
  const lambdaAlarmMetric = { x: 0 }
  const logAlarmMetric = { x: 1 }
  toLambdaErrorAlarm.mockReturnValue(lambdaAlarmMetric)
  toLogErrorAlarm.mockReturnValue(logAlarmMetric)
  createTopic.mockReturnValue({
    promise: () => ({ TopicArn: alarmTopicName }),
  })
  putMetricAlarm.mockReturnValue({ promise: () => ({}) })

  await expect(cas(consumerId)).resolves.toEqual(undefined)

  expect(toLambdaErrorAlarm).toHaveBeenCalledWith(consumerId, alarmTopicName)
  expect(toLogErrorAlarm).toHaveBeenCalledWith(consumerId, alarmTopicName)
  expect(putMetricAlarm).toHaveBeenCalledWith(lambdaAlarmMetric)
  expect(putMetricAlarm).toHaveBeenCalledWith(logAlarmMetric)
})
