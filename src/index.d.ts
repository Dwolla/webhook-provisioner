export type ConsumerId = number

export interface IEvent {
  consumerId: ConsumerId
}

export interface IConcurrency {
  reserved: number
  post: number
}

export interface IConcurrencyEvent extends IEvent {
  concurrency: IConcurrency
}

export interface IDisableEvent extends IEvent {
  purgeQueue?: boolean
}

export interface IUpdateEvent {
  consumerIds: ConsumerId[]
  concurrency: IConcurrency
}

export type Res = Readonly<{
  statusCode: number
  body: string
}>

export type Location = Readonly<{
  bucket: string
  key: string
  version: string
}>

type Queue = Readonly<{ url: string; arn: string }>

export type Queues = Readonly<{ partner: Queue; result: Queue; error: Queue }>

export type Role = Readonly<{
  roleArn: string
  roleName: string
  policyArn: string
}>

export type CreateFuncReq = Readonly<{
  cId: ConsumerId
  concurrency: IConcurrency
  location: Location
  queues: Queues
  role: Role
  timeout: number
  maxRetries: number
}>

export interface IFunc {
  arn: string
  eventSourceId?: string
}

export type LogGroup = Readonly<{ arn: string }>
