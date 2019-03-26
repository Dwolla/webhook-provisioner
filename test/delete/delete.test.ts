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
const cw = (CloudWatch as unknown) as jest.Mock
const cwl = (CloudWatchLogs as unknown) as jest.Mock
const iam = (IAM as unknown) as jest.Mock
const lam = (Lambda as unknown) as jest.Mock
const sqs = (SQS as unknown) as jest.Mock
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
  getRole
}))
lam.mockImplementationOnce(() => ({
  deleteEventSourceMapping,
  deleteFunction,
  listEventSourceMappings
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
  const cId = 123
  const ln = "ln"
  const lamen = "lamen"
  const logen = "logen"
  const fn = "fn"
  const lgn = "lgn"
  const qn = "qn"
  const qda = "qda"
  const ra = "role-arn-role"
  const pa = "policy-arn-policy"
  const rn = "rn"
  const url = "url"
  const id = "id"
  lambdaName.mockReturnValue(ln)
  lambdaErrorAlarmName.mockReturnValue(lamen)
  logErrorAlarmName.mockReturnValue(logen)
  filterName.mockReturnValue(fn)
  logGroupName.mockReturnValue(lgn)
  queueName.mockReturnValue(qn)
  queueDepthAlarmName.mockReturnValue(qda)
  roleName.mockReturnValue(rn)
  deleteAlarms.mockReturnValue({ promise: () => ({}) })
  deleteMetricFilter.mockReturnValue({ promise: () => ({}) })
  deleteLogGroup.mockReturnValue({ promise: () => ({}) })
  deleteFunction.mockReturnValue({ promise: () => ({}) })
  getQueueUrl.mockReturnValue({ promise: () => ({ QueueUrl: url }) })
  deleteQueue.mockReturnValue({ promise: () => ({}) })
  getRole.mockReturnValue({ promise: () => ({ Role: { Arn: ra } }) })
  detachRolePolicy.mockReturnValue({ promise: () => ({}) })
  deletePolicy.mockReturnValue({ promise: () => ({}) })
  deleteRole.mockReturnValue({ promise: () => ({}) })
  listEventSourceMappings.mockReturnValue({
    promise: () => ({ EventSourceMappings: [{ UUID: id }] })
  })
  deleteEventSourceMapping.mockReturnValue({ promise: () => ({}) })

  await expect(del(cId)).resolves.toBe(undefined)

  expect(deleteAlarms).toHaveBeenCalledWith({ AlarmNames: [qda, lamen, logen] })
  expect(deleteMetricFilter).toHaveBeenCalledWith({
    filterName: fn,
    logGroupName: lgn
  })
  expect(deleteLogGroup).toHaveBeenCalledWith({ logGroupName: lgn })
  expect(deleteFunction).toHaveBeenCalledWith({ FunctionName: ln })
  expect(getQueueUrl).toHaveBeenCalledWith({ QueueName: qn })
  expect(deleteQueue).toHaveBeenCalledWith({ QueueUrl: url })
  expect(getRole).toHaveBeenCalledWith({ RoleName: rn })
  expect(detachRolePolicy).toHaveBeenCalledWith({ RoleName: rn, PolicyArn: pa })
  expect(deletePolicy).toHaveBeenCalledWith({ PolicyArn: pa })
  expect(deleteRole).toHaveBeenCalledWith({ RoleName: rn })
  expect(listEventSourceMappings).toHaveBeenCalledWith({ FunctionName: ln })
  expect(deleteEventSourceMapping).toHaveBeenCalledWith({ UUID: id })
})
