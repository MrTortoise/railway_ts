import { Just, Maybe, Nothing } from "purify-ts/Maybe"
import { Either, Left, Right } from 'purify-ts/Either'
import { error } from "./logger"
import { EnvironmentError } from "./errors"

/*
Looking to figure out how to use either.
Goal is to figure out how to take an either and pipe its results into another function that returns one
we want to fail fast if the either if Left - put pipe if it is right
this way we end up with a 'railroad' like programming

*/
interface Config {
  port: Maybe<string>
}

const failGetConfig = (): Maybe<Config> => Nothing
const getConfig = (): Maybe<Config> => {
  return Just({ port: Just('1234') })
}

const getPort = (f: () => Maybe<Config>): Either<EnvironmentError, string> => {
  return f()
    .chain(x => x.port)
    .toEither({ message: "missing environment config", data: { config: 'port' } })
}

const portToNumber = (f: () => Maybe<Config>): Either<EnvironmentError, number> => {
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
    const expected = portToNumber(failGetConfig)
    expect(expected).toStrictEqual(Left({ "data": { "config": "port" }, "message": "missing environment config" }))
  })
})



