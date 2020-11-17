import CloudWatchLogs from "aws-sdk/clients/cloudwatchlogs"
import * as mapper from "../../src/create/mapper"

jest.mock("aws-sdk/clients/cloudwatchlogs")
jest.mock("../../src/create/mapper")
const cwl = (CloudWatchLogs as unknown) as jest.Mock
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
  const arn = "arn"
  const cId = 123
  const cl = { x: 0 }
  const dl = { x: 1 }
  const pm = { x: 2 }
  const rp = { x: 3 }
  toCreateLogGroup.mockReturnValue(cl)
  toDescribeLogGroups.mockReturnValue(dl)
  toPutMetricFilter.mockReturnValue(pm)
  toPutRetentionPolicy.mockReturnValue(rp)
  createLogGroup.mockReturnValue({ promise: () => ({}) })
  putRetentionPolicy.mockReturnValue({ promise: () => ({}) })
  putMetricFilter.mockReturnValue({ promise: () => ({}) })
  describeLogGroups.mockReturnValue({
    promise: () => ({ logGroups: [{ arn }] }),
  })

  await expect(clg(cId)).resolves.toEqual({ arn })

  expect(toCreateLogGroup).toHaveBeenCalledWith(cId)
  expect(createLogGroup).toHaveBeenCalledWith(cl)
  expect(putRetentionPolicy).toHaveBeenCalledWith(rp)
  expect(toPutMetricFilter).toHaveBeenCalledWith(cId)
  expect(toPutRetentionPolicy).toHaveBeenCalledWith(cId)
  expect(putMetricFilter).toHaveBeenCalledWith(pm)
  expect(toDescribeLogGroups).toHaveBeenCalledWith(cId)
  expect(describeLogGroups).toHaveBeenCalledWith(dl)
})
