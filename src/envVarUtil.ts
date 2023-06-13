export const envVarRequired = (name: string): string => {
  const envVar = process.env[name]
  if (envVar) {
    return envVar
  }
  throw new Error(`${name} required`)
}
