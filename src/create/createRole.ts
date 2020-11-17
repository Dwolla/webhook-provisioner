import { log } from "@therockstorm/utils"
import IAM from "aws-sdk/clients/iam"
import { ConsumerId, LogGroup, Queues, Role } from ".."
import { logRes } from "../util"
import { toCreatePolicy, toCreateRole } from "./mapper"

const iam = new IAM()

export const createRole = async (
  cId: ConsumerId,
  lg: LogGroup,
  qs: Queues
): Promise<Role> =>
  await logRes<Role>("Creating role and policy", async () => {
    const [rr, pr] = await Promise.all([
      iam.createRole(toCreateRole(cId)).promise(),
      iam.createPolicy(toCreatePolicy(cId, lg, qs)).promise(),
    ])
    const roleName = rr.Role.RoleName
    const policyArn = pr.Policy && pr.Policy.Arn ? pr.Policy.Arn : ""
    log(`Attaching ${roleName} to ${policyArn}`)
    await iam
      .attachRolePolicy({ RoleName: roleName, PolicyArn: policyArn })
      .promise()
    return { roleArn: rr.Role.Arn, roleName, policyArn }
  })
