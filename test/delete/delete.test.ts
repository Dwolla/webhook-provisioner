import CloudWatch from "aws-sdk/clients/cloudwatch"
import CloudWatchLogs from "aws-sdk/clients/cloudwatchlogs"
import IAM from "aws-sdk/clients/iam"
import Lambda from "aws-sdk/clients/lambda"
import SQS from "aws-sdk/clients/sqs"
import * as mapper from "../../src/mapper"

jest.mock("aws-sdk/clients/cloudwatch")
jest.mock("aws-sdk/clients/cloudwatchlogs")
jest.mock("aws-sdk/clients/iam")
jest.mock("aws-sdk/clients/lambda")
jest.mock("aws-sdk/clients/sqs")
jest.mock("../../src/mapper")
const cw = CloudWatch as unknown as jest.Mock
const cwl = CloudWatchLogs as unknown as jest.Mock
const iam = IAM as unknown as jest.Mock
const lam = Lambda as unknown as jest.Mock
const sqs = SQS as unknown as jest.Mock
const deleteAlarms = jest.fn()
const deleteLogGroup = jest.fn()
const deleteMetricFilter = jest.fn()
const getRole = jest.fn()
const detachRolePolicy = jest.fn()
const deletePolicy = jest.fn()
const deleteRole = jest.fn()
const deleteFunction = jest.fn()
const listEventSourceMappings = jest.fn()
const deleteEventSourceMapping = jest.fn()
const getQueueUrl = jest.fn()
const deleteQueue = jest.fn()
cw.mockImplementationOnce(() => ({ deleteAlarms }))
cwl.mockImplementationOnce(() => ({ deleteLogGroup, deleteMetricFilter }))
iam.mockImplementationOnce(() => ({
  deletePolicy,
  deleteRole,
  detachRolePolicy,
  getRole,
}))
lam.mockImplementationOnce(() => ({
  deleteEventSourceMapping,
  deleteFunction,
  listEventSourceMappings,
}))
sqs.mockImplementationOnce(() => ({ getQueueUrl, deleteQueue }))
const lambdaName = mapper.lambdaName as jest.Mock
const lambdaErrorAlarmName = mapper.lambdaErrorAlarmName as jest.Mock
const logErrorAlarmName = mapper.logErrorAlarmName as jest.Mock
const filterName = mapper.filterName as jest.Mock
const logGroupName = mapper.logGroupName as jest.Mock
const queueName = mapper.queueName as jest.Mock
const queueDepthAlarmName = mapper.queueDepthAlarmName as jest.Mock
const roleName = mapper.roleName as jest.Mock
import { del } from "../../src/delete/delete"

test("delete", async () => {
  const consumerId = 123
  const lName = "ln"
  const lamen = "lamen"
  const logen = "logen"
  const filter = "fn"
  const logGroup = "lgn"
  const queue = "qn"
  const queueDepthAlarm = "qda"
  const arnRole = "role-arn-role"
  const policyArn = "policy-arn-policy"
  const role = "rn"
  const queueUrl = "url"
  const id = "id"
  lambdaName.mockReturnValue(lName)
  lambdaErrorAlarmName.mockReturnValue(lamen)
  logErrorAlarmName.mockReturnValue(logen)
  filterName.mockReturnValue(filter)
  logGroupName.mockReturnValue(logGroup)
  queueName.mockReturnValue(queue)
  queueDepthAlarmName.mockReturnValue(queueDepthAlarm)
  roleName.mockReturnValue(role)
  deleteAlarms.mockReturnValue({ promise: () => ({}) })
  deleteMetricFilter.mockReturnValue({ promise: () => ({}) })
  deleteLogGroup.mockReturnValue({ promise: () => ({}) })
  deleteFunction.mockReturnValue({ promise: () => ({}) })
  getQueueUrl.mockReturnValue({ promise: () => ({ QueueUrl: queueUrl }) })
  deleteQueue.mockReturnValue({ promise: () => ({}) })
  getRole.mockReturnValue({ promise: () => ({ Role: { Arn: arnRole } }) })
  detachRolePolicy.mockReturnValue({ promise: () => ({}) })
  deletePolicy.mockReturnValue({ promise: () => ({}) })
  deleteRole.mockReturnValue({ promise: () => ({}) })
  listEventSourceMappings.mockReturnValue({
    promise: () => ({ EventSourceMappings: [{ UUID: id }] }),
  })
  deleteEventSourceMapping.mockReturnValue({ promise: () => ({}) })

  await expect(del(consumerId)).resolves.toBe(undefined)

  expect(deleteAlarms).toHaveBeenCalledWith({
    AlarmNames: [queueDepthAlarm, lamen, logen],
  })
  expect(deleteMetricFilter).toHaveBeenCalledWith({
    filterName: filter,
    logGroupName: logGroup,
  })
  expect(deleteLogGroup).toHaveBeenCalledWith({ logGroupName: logGroup })
  expect(deleteFunction).toHaveBeenCalledWith({ FunctionName: lName })
  expect(getQueueUrl).toHaveBeenCalledWith({ QueueName: queue })
  expect(deleteQueue).toHaveBeenCalledWith({ QueueUrl: queueUrl })
  expect(getRole).toHaveBeenCalledWith({ RoleName: role })
  expect(detachRolePolicy).toHaveBeenCalledWith({
    RoleName: role,
    PolicyArn: policyArn,
  })
  expect(deletePolicy).toHaveBeenCalledWith({ PolicyArn: policyArn })
  expect(deleteRole).toHaveBeenCalledWith({ RoleName: role })
  expect(listEventSourceMappings).toHaveBeenCalledWith({ FunctionName: lName })
  expect(deleteEventSourceMapping).toHaveBeenCalledWith({ UUID: id })
})
