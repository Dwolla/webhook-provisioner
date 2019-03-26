export type ConsumerId = number

export interface IEvent {
  consumerId: ConsumerId
}

export interface Concurrency {
  reserved: number
  post: number
}

export interface IConcurrencyEvent extends IEvent {
  concurrency: Concurrency
}

export interface IDisableEvent extends IEvent {
  purgeQueue?: boolean
}

export interface IUpdateEvent {
  consumerIds: ConsumerId[]
  concurrency: Concurrency
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
  concurrency: Concurrency
  location: Location
  queues: Queues
  role: Role
  timeout: number
}>

export interface Func {
  arn: string
  eventSourceId?: string
}

export type LogGroup = Readonly<{ arn: string }>
