import { Handler } from "aws-lambda/handler"

export type ConsumerId = number | string

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
  name?: string
}

export type LogGroup = Readonly<{ arn: string }>

export type UpdateConsumersCodeRequest = {
  consumerIds: ConsumerId[]
  nodeVersion: string
  codeName: string
}

export type UpdateConsumersCodeResponse = {
  statusCode: number
  body: {
    message: string
  }
}

export type UpdateConsumersCodeHandler = Handler<
  UpdateConsumersCodeRequest,
  UpdateConsumersCodeResponse
>
