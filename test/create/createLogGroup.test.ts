import CloudWatchLogs from "aws-sdk/clients/cloudwatchlogs"
import * as mapper from "../../src/create/mapper"

jest.mock("aws-sdk/clients/cloudwatchlogs")
jest.mock("../../src/create/mapper")
const cwl = CloudWatchLogs as unknown as jest.Mock
const toCreateLogGroup = mapper.toCreateLogGroup as jest.Mock
const toDescribeLogGroups = mapper.toDescribeLogGroups as jest.Mock
const toPutMetricFilter = mapper.toPutMetricFilter as jest.Mock
const toPutRetentionPolicy = mapper.toPutRetentionPolicy as jest.Mock
const createLogGroup = jest.fn()
const putRetentionPolicy = jest.fn()
const describeLogGroups = jest.fn()
const putMetricFilter = jest.fn()
cwl.mockImplementationOnce(() => ({
  createLogGroup,
  describeLogGroups,
  putMetricFilter,
  putRetentionPolicy,
}))
import { createLogGroup as clg } from "../../src/create/createLogGroup"

test("createLogGroup", async () => {
  const resourceName = "arn"
  const consumerId = 123
  const createLogGroupRequest = { x: 0 }
  const describeLogGroupRequest = { x: 1 }
  const metricFilter = { x: 2 }
  const retentionPolicy = { x: 3 }
  toCreateLogGroup.mockReturnValue(createLogGroupRequest)
  toDescribeLogGroups.mockReturnValue(describeLogGroupRequest)
  toPutMetricFilter.mockReturnValue(metricFilter)
  toPutRetentionPolicy.mockReturnValue(retentionPolicy)
  createLogGroup.mockReturnValue({ promise: () => ({}) })
  putRetentionPolicy.mockReturnValue({ promise: () => ({}) })
  putMetricFilter.mockReturnValue({ promise: () => ({}) })
  describeLogGroups.mockReturnValue({
    promise: () => ({ logGroups: [{ arn: resourceName }] }),
  })

  await expect(clg(consumerId)).resolves.toEqual({ arn: resourceName })

  expect(toCreateLogGroup).toHaveBeenCalledWith(consumerId)
  expect(createLogGroup).toHaveBeenCalledWith(createLogGroupRequest)
  expect(putRetentionPolicy).toHaveBeenCalledWith(retentionPolicy)
  expect(toPutMetricFilter).toHaveBeenCalledWith(consumerId)
  expect(toPutRetentionPolicy).toHaveBeenCalledWith(consumerId)
  expect(putMetricFilter).toHaveBeenCalledWith(metricFilter)
  expect(toDescribeLogGroups).toHaveBeenCalledWith(consumerId)
  expect(describeLogGroups).toHaveBeenCalledWith(describeLogGroupRequest)
})
