import IAM from "aws-sdk/clients/iam"
import * as mapper from "../../src/create/mapper"

jest.mock("aws-sdk/clients/iam")
jest.mock("../../src/create/mapper")
const iam = (IAM as unknown) as jest.Mock
const toCreateRole = mapper.toCreateRole as jest.Mock
const toCreatePolicy = mapper.toCreatePolicy as jest.Mock
const createRole = jest.fn()
const createPolicy = jest.fn()
const attachRolePolicy = jest.fn()
iam.mockImplementationOnce(() => ({
  attachRolePolicy,
  createPolicy,
  createRole
}))
import { createRole as cr } from "../../src/create/createRole"

test("createLogGroup", async () => {
  const cId = 123
  const c = { x: 0 }
  const cp = { x: 1 }
  const lg = { arn: "arn" }
  const qs = {
    error: { url: "eu", arn: "e" },
    partner: { url: "pu", arn: "p" },
    result: { url: "ru", arn: "r" }
  }
  const r = { roleName: "rn", roleArn: "ra", policyArn: "pa" }
  toCreateRole.mockReturnValue(c)
  toCreatePolicy.mockReturnValue(cp)
  createRole.mockReturnValue({
    promise: () => ({ Role: { RoleName: r.roleName, Arn: r.roleArn } })
  })
  createPolicy.mockReturnValue({
    promise: () => ({ Policy: { Arn: r.policyArn } })
  })
  attachRolePolicy.mockReturnValue({ promise: () => ({}) })

  await expect(cr(cId, lg, qs)).resolves.toEqual(r)

  expect(toCreateRole).toHaveBeenCalledWith(cId)
  expect(createRole).toHaveBeenCalledWith(c)
  expect(toCreatePolicy).toHaveBeenCalledWith(cId, lg, qs)
  expect(createPolicy).toHaveBeenCalledWith(cp)
  expect(attachRolePolicy).toHaveBeenCalledWith({
    PolicyArn: r.policyArn,
    RoleName: r.roleName
  })
})
