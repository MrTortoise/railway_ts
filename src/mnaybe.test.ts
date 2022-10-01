import { Maybe, Just, Nothing } from 'purify-ts/Maybe'

interface Config {
  port: Maybe<string>
}

const failGetConfig = (): Maybe<Config> => Nothing
const getConfig = (): Maybe<Config> => {
  return Just({ port: Just( '1234') })
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