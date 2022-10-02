import { APIGatewayProxyEvent, APIGatewayProxyEventQueryStringParameters } from 'aws-lambda'
import { curry, Either, Just, Left, Maybe, Nothing, Right, string } from 'purify-ts'
import { DependencyError, ParamError, SomeError, StateErrorMessages } from './errors'
import { uuid, newUuid, UUID } from './uuid'

import { EitherAsync } from 'purify-ts/EitherAsync'
import { ImportCatalogToGlueRequest } from 'aws-sdk/clients/glue'

const baseRequest: APIGatewayProxyEvent = {
  httpMethod: 'get',
  body: '',
  headers: {},
  isBase64Encoded: false,
  multiValueHeaders: {},
  multiValueQueryStringParameters: {},
  path: '/hello',
  pathParameters: {},
  queryStringParameters: {},
  requestContext: {
    accountId: '123456789012',
    apiId: '1234',
    authorizer: {},
    httpMethod: 'get',
    identity: { sourceIp: '' },
    path: '/hello',
    protocol: 'HTTP/1.1',
    requestId: 'c6af9ac6-7b61-11e6-9a41-93e8deadbeef',
    requestTimeEpoch: 1428582896000,
    resourceId: '123456',
    resourcePath: '/hello',
    stage: 'dev'
  },
  resource: '',
  stageVariables: {}
}

// Define a base command type, all commands come from this
// All commands need tyo load an entity from a database
type Command = {
  entityId: UUID
}
type WoopAThingCommand = Command & {
  thingToWoop: string
}

const invalidEvent: APIGatewayProxyEvent = {
  ...baseRequest,
  queryStringParameters: {
    sessionId: "asdf",
    thingToWoop: 'dave'
  }
}

const validEvent = (sessionId: string): APIGatewayProxyEvent => {
  return {
    ...baseRequest,
    queryStringParameters: {
      sessionId,
      thingToWoop: 'dave'
    }
  }
}

const getQueryStrings = (e: APIGatewayProxyEvent): Either<ParamError, APIGatewayProxyEventQueryStringParameters> => {
  if (e.queryStringParameters != null)
    return Right(e.queryStringParameters)
  else return Left({ message: "Param Validation Failed", data: { parameter: "queryString", value: undefined, reason: "missing" } })
}

const queryStringsToFetchAThingCommand = (queryStrings: APIGatewayProxyEventQueryStringParameters): Either<ParamError, WoopAThingCommand> => {
  const qsSessionId = queryStrings.sessionId
  if (qsSessionId == undefined) return Left({ message: "Param Validation Failed", data: { parameter: "queryStrings.sessionId", value: undefined, reason: "missing" } })

  const thingToWoop = queryStrings.thingToWoop
  if (thingToWoop == undefined) return Left({ message: "Param Validation Failed", data: { parameter: "queryStrings.thingToWoop", value: undefined, reason: "missing" } })

  return uuid(qsSessionId)
    .map(sessionId => { return { entityId: sessionId, thingToWoop } })
    .toEither({ message: "Param Validation Failed", data: { parameter: "queryStrings.sessionId", value: qsSessionId, reason: "not uuid" } })
}


// Now we can build a really generic event to commandn function and use currying to get a specific instance useful here
// go googel currying we will be using it a lot more!
function eventToCommand<TCommand extends Command>(toCommand: (qs: APIGatewayProxyEventQueryStringParameters) => Either<ParamError, TCommand>, e: APIGatewayProxyEvent): Either<ParamError, TCommand> {
  return getQueryStrings(e)
    .chain(toCommand)
}

const curriedEventToCommand = curry(eventToCommand)
const eventToWoopCommand = curriedEventToCommand(queryStringsToFetchAThingCommand) // This build woop commands from events


describe('need to parse an event into a command', () => {
  it('will parse into the fetch command', () => {

    const sessionId = newUuid()
    const commandResult = eventToWoopCommand(validEvent(sessionId))
    expect(commandResult).toStrictEqual(Right({ entityId: sessionId, thingToWoop: 'dave' }))
  })

  it('will error into an error when invalid session id', () => {
    const commandResult = eventToWoopCommand(invalidEvent)
    expect(commandResult).toStrictEqual(Left({ message: "Param Validation Failed", data: { parameter: "queryStrings.sessionId", value: "asdf", reason: "not uuid" } }))
  })
})

// this is the domain type - this maps onto language
type Aggregate = {
  gid: string
  data: string
}

// this is the storage type - this maps onto whatever the storage medium needs
type Session = {
  Id: number
  gid: string
  data: string
}

const loadSessionSuccessfully = async (sessionId: string): Promise<Either<DependencyError, Session>> => {
  return Right({ Id: 1, gid: sessionId, data: 'dave' })
}

const sessionToAggregate = (s: Session) => ({ gid: s.gid, data: s.data })
const loadAggregate = async (sessionId: UUID, sessionAdapter: (sessionId: string) => Promise<Either<DependencyError, Session>>): Promise<Either<SomeError, Aggregate>> => {
  return (await sessionAdapter(sessionId))
    .map(sessionToAggregate)
}

type AggregateWithCommand<TCommand extends Command> = {
  command: TCommand,
  aggregate: Aggregate
}

// we end up wanting to pass both the command and the aggregate around so a function can combine them
// this just takes both bits and return an object with them
async function loadWithCommand<TCommand extends Command>(
  loadSessionAdapter: (sessionId: string) => Promise<Either<DependencyError, Session>>,
  command: TCommand)
  : Promise<Either<SomeError, AggregateWithCommand<TCommand>>> {
  return (await loadAggregate(command.entityId, loadSessionAdapter))
    .map(aggregate => ({ command, aggregate }))
}



type CommandParser<TCommand extends Command> = (event: APIGatewayProxyEvent) => Either<ParamError, TCommand>
type LoadSession = (sessionId: string) => Promise<Either<DependencyError, Session>>
type SaveSession = (agg: Aggregate) => Promise<Either<DependencyError, Aggregate>>
type Action<TCommand extends Command> = (aggCommand: AggregateWithCommand<TCommand>) => Promise<Either<SomeError, AggregateWithCommand<TCommand>>>

/**
 * Intended to be curried - enables a list of actions to be used as if one action
 * sequentially executes them and passes the new aggregate through
 * @param actions 
 * @param aggregate 
 * @returns 
 */
async function doActions<TCommand extends Command>(actions: Action<TCommand>[], aggregate: AggregateWithCommand<TCommand>): Promise<Either<SomeError, AggregateWithCommand<TCommand>>> {
  const actionsInner = async (actions: Action<TCommand>[], aggregate: AggregateWithCommand<TCommand>): Promise<Either<SomeError, AggregateWithCommand<TCommand>>> => {
    if (actions.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const a = actions.pop()!

      const result = await a(aggregate)
      if (result.isLeft()) {
        return result
      }
      return actionsInner(actions, result.unsafeCoerce())
    } else {
      return Right(aggregate)
    }
  }

  const actionsBackwards = actions.reverse()
  return actionsInner(actionsBackwards, aggregate)
}

type ILogger = {
  info(message: string, data: object)
  error(message: string, data: object)
}

class Logger implements ILogger {
  error(message: string, data: object) {
    console.error(message, data)
  }
  info(message: string, data: object) {
    console.info(message, data)
  }
}

// if this was work you could call this a lambda handler - well once you curried the it until it only took e ...
function doCommandOnThing<TCommand extends Command>(
  logger: ILogger,
  commandParser: CommandParser<TCommand>,
  loadSessionAdapter: LoadSession,
  action: Action<TCommand>,
  saveSessionAdapter: SaveSession,
  e: APIGatewayProxyEvent): Promise<Either<SomeError, Aggregate>> {
  const curriedLoad = curry(loadWithCommand)(loadSessionAdapter)
  logger.info("starting", { handler: "doCommadnOnThing" })
  return EitherAsync.liftEither(commandParser(e))
    .chain(curriedLoad)
    .chain(action)
    .map(agc => agc.aggregate)
    .ifRight(saveSessionAdapter)
    .ifRight((agg) => logger.info("Success on doCommand", { data: { handler: "doCommandThing", agg } }))
    .ifLeft((err) => logger.error("Failure on doCommand", { data: { err } }))
    .run()
}



async function doThing<TCommand extends Command>(aggCommand: AggregateWithCommand<TCommand>) {
  const aggregate = { ...aggCommand.aggregate }
  aggregate.data = "woop"
  return Right({ ...aggCommand, aggregate })
}

const saveSessionAdapter = async (agg: Aggregate): Promise<Either<DependencyError, Aggregate>> => {
  console.log("Session saved", { agg })
  return Right(agg)
}

describe('woop a thing woops aggregates', () => {
  it('will return error if the command fails to parse', async () => {
    const curriedDoer = curry(doCommandOnThing)
    const logger = new Logger()
    const eventHandler = curriedDoer(logger, eventToWoopCommand, loadSessionSuccessfully, doThing, saveSessionAdapter)

    const expected = await eventHandler(validEvent("dave"))

    expect(expected).toStrictEqual(Left({ message: "Param Validation Failed", data: { parameter: "queryStrings.sessionId", reason: "not uuid", value: "dave" } }))
  })

  it('will succees with a valid session id', async () => {
    const curriedDoer = curry(doCommandOnThing)
    const logger = new Logger()
    const eventHandler = curriedDoer(logger, eventToWoopCommand, loadSessionSuccessfully, doThing, saveSessionAdapter)

    const sessionId = newUuid()
    const expected = await eventHandler(validEvent(sessionId))

    expect(expected).toStrictEqual(Right({ gid: sessionId, data: "woop" }))
  })

  it('will fail when session fails to load', async () => {
    const badLoad: LoadSession = async () => {
      return Left({ message: "Database blew up", data: { dbAddress: "daves address" } })
    }
    const logger = new Logger()
    const curriedDoer = curry(doCommandOnThing)
    const eventHandler = curriedDoer(logger, eventToWoopCommand, badLoad, doThing, saveSessionAdapter)

    const sessionId = newUuid()
    const expected = await eventHandler(validEvent(sessionId))

    expect(expected).toStrictEqual(Left({ message: "Database blew up", data: { "dbAddress": "daves address" } }))

  })

  it('will fail when session fails to do a thing', async () => {
    const baddoThing: Action<Command> = async () => {
      return Left({ message: "Database blew up", data: { dbAddress: "daves address" } })
    }
    const curriedDoer = curry(doCommandOnThing)
    const logger = new Logger()
    const eventHandler = curriedDoer(logger, eventToWoopCommand, loadSessionSuccessfully, baddoThing, saveSessionAdapter)

    const sessionId = newUuid()
    const expected = await eventHandler(validEvent(sessionId))

    expect(expected).toStrictEqual(Left({ message: "Database blew up", data: { "dbAddress": "daves address" } }))
  })
})


describe('actions often have their own dependencies', () => {
  it('will take dependencies via currying', () => {

  })
})
