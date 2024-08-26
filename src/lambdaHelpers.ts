import Lambda, { EnvironmentVariables } from "aws-sdk/clients/lambda"
const lam = new Lambda()

export const getLambdaEnvVars = async (
  ln: string
): Promise<EnvironmentVariables> => {
  const env = (
    await lam.getFunctionConfiguration({ FunctionName: ln }).promise()
  ).Environment
  return env?.Variables ?? {}
}
