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
  createRole,
}))
import { createRole as cr } from "../../src/create/createRole"

test("createRole", async () => {
  const consumerId = 123
  const createRoleRequest = { x: 0 }
  const createPolicyRequest = { x: 1 }
  const logGroup = { arn: "arn" }
  const queues = {
    error: { url: "eu", arn: "e" },
    partner: { url: "pu", arn: "p" },
    result: { url: "ru", arn: "r" },
  }
  const r = { roleName: "rn", roleArn: "ra", policyArn: "pa" }
  toCreateRole.mockReturnValue(createRoleRequest)
  toCreatePolicy.mockReturnValue(createPolicyRequest)
  createRole.mockReturnValue({
    promise: () => ({ Role: { RoleName: r.roleName, Arn: r.roleArn } }),
  })
  createPolicy.mockReturnValue({
    promise: () => ({ Policy: { Arn: r.policyArn } }),
  })
  attachRolePolicy.mockReturnValue({ promise: () => ({}) })

  await expect(cr(consumerId, logGroup, queues)).resolves.toEqual(r)

  expect(toCreateRole).toHaveBeenCalledWith(consumerId)
  expect(createRole).toHaveBeenCalledWith(createRoleRequest)
  expect(toCreatePolicy).toHaveBeenCalledWith(consumerId, logGroup, queues)
  expect(createPolicy).toHaveBeenCalledWith(createPolicyRequest)
  expect(attachRolePolicy).toHaveBeenCalledWith({
    PolicyArn: r.policyArn,
    RoleName: r.roleName,
  })
})
