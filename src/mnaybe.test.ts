
import { Right } from 'purify-ts'
import { Maybe, Just, Nothing } from 'purify-ts/Maybe'


/*
Tests to figure out hwo to use 
https://gigobyte.github.io/purify/adts/Maybe

this took longer than expected!
*/

interface Config {
  port: Maybe<string>
}

const failGetConfig = (): Maybe<Config> => Nothing
const getConfig = (): Maybe<Config> => {
  return Just({ port: Just('1234') })
}

it('will get the port', () => {
  const port = getConfig()
    .chain(x => x.port)
    .map(parseInt)
    .orDefault(8080)

  expect(port).toBe(1234)
})

it('will get the default port', () => {
  const port = failGetConfig()
    .chain(x => x.port)
    .map(parseInt)
    .orDefault(8080)

  expect(port).toBe(8080)
})

const getPort = (f: () => Maybe<Config>): Maybe<number> => {
  const port = f()
    .chain(x => x.port)
    .map(parseInt)

  return port;
}

it('will work on extracted function', () => {
  expect(getPort(getConfig)).toStrictEqual(Just(1234))
})

type ConfigError = "no port in config"


describe('maybe to either', () => {
  it('will return Either of value', () => {
    const expected = getPort(getConfig).toEither<ConfigError>("no port in config")
    expect(expected).toStrictEqual(Right(1234))
  })
})