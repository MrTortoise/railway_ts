/*

We have a load of code that can run in sequence
Each part can throw an error.
The type of error is related to the response
if it is environmental it is critical (and 500)
if it is param it is 4xx (Param error)
if it is a value not found it is 401 (unauthorized) (State Error)
if it is dependency it is 5xx (Depodenency Error)
*/


export type EnvironmentCriticalMessage = "missing environment config"
export type EnvironmentData = {
  config: string
}

export type EnvironmentError = {
  message: EnvironmentCriticalMessage
  data: EnvironmentData
}

export type ParamErrorMessage = "Param Validation Failed"
export type ParamData = {
  parameter: string
  value: string | undefined
  reason?: string
}

export type ParamError = {
  message: ParamErrorMessage
  data: ParamData
}

export type EntityType = "session"
export type StateErrorMessages = "Entity not found"
export type EntityNotFoundData = {
  entityId: string
  entityType: EntityType
}

export type StateError = {
  message: StateErrorMessages
  data: EntityNotFoundData
}

export type DependencyErrorMessages = "Could not parse input" | "no port in config"
export type FailedToParseData = {
  errorMessage: string
  resourceHost: string
  resourceId: string
}

export type DependencyError = {
  message: DependencyErrorMessages
  data: FailedToParseData
}
export type SomeError =
  DependencyError
  | StateError
  | ParamError
  | EnvironmentError
