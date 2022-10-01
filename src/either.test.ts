import { Just, Maybe, Nothing } from "purify-ts/Maybe"
import { Either, Left, Right } from 'purify-ts/Either'
import { error } from "./logger"



/*

Looking to figure out how to use either.
Goal is to figure out how to take an either and pipe its results into another function that returns one
we want to fail fast if the either if Left - put pipe if it is right
this way we end up with a 'railroad' like programming


We have a load of code that can run in sequence
Each part can throw an error.
The type of error is related to the response
if it is param it is 4xx (Param error)
if it is a value not found it is 401 (unauthorized) (State Error)
if it is dependency it is 5xx (Depodenency Error)
*/

type ParamErrorMessages = "Param Validation Failed"
type ParamData = {
  parameter: string
  reason: string
}

type StateErrorMessages = "Session not found"
type SessionNotFoundData = {
  sessionId: string
}

type DependencyErrorMessages = "Could not parse input"
type FailedToParseData = {
  errorMessage: string
  resourceHost: string
  resourceId: string
}

type ErrorMessages =
  ParamErrorMessages
  | StateErrorMessages
  | DependencyErrorMessages
type ErrorData =
  Record<string, never>
  | ParamData
  | SessionNotFoundData
  | FailedToParseData



type ErrorWithData = {
  message: ErrorMessages,
  data: ErrorData
}

interface Config {
  port: Maybe<string>
}

const failGetConfig = (): Maybe<Config> => Nothing
const getConfig = (): Maybe<Config> => {
  return Just({ port: Just('1234') })
}


type ConfigError = "no port in config"

type SomeError = ConfigError





const getPort = (f: () => Maybe<Config>): Either<ConfigError, string> => {
  return f()
    .chain(x => x.port)
    .toEither("no port in config")
}

const portToNumber = (f: () => Maybe<Config>): Either<ConfigError, number> => {
  return getPort(f)
    .ifLeft((e) => error(e))
    .map(parseInt)
}

describe('Either will eiter do a thing or we want to shortcut with errors', () => {
  it('given a result return a result', () => {
    const expected = portToNumber(getConfig).unsafeCoerce()
    expect(expected).toBe(1234)
  })

  it('given will  throw error', () => {
    const expected = portToNumber(failGetConfig).unsafeCoerce()
    expect(expected).toBe(1234)
  })
})



