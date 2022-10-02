import { APIGatewayProxyEvent, APIGatewayProxyEventQueryStringParameters } from 'aws-lambda'
import { Either, Just, Left, Maybe, Nothing, Right, string } from 'purify-ts'
import { ParamError } from './errors'
import { uuid, newUuid, UUID } from './uuid'

function buildRequest(overrides?: any): APIGatewayProxyEvent {
  const defaultRequest = {
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
  };
  return { ...defaultRequest, ...overrides }
}

interface DoAThingCommand {
  sessionId: UUID
  thingToDoToId: string
}

const invalidEvent: APIGatewayProxyEvent = {
  ...buildRequest(),
  queryStringParameters: {
    sessionId: "asdf",
    thingToDoToId: 'dave'
  }
}

const validEvent = (sessionId: string): APIGatewayProxyEvent => {
  return {
    ...buildRequest(),
    queryStringParameters: {
      sessionId,
      thingToDoToId: 'dave'
    }
  }
}

const getQueryStrings = (e: APIGatewayProxyEvent): Either<ParamError, APIGatewayProxyEventQueryStringParameters> => {
  if (e.queryStringParameters != null)
    return Right(e.queryStringParameters)
  else return Left({ message: "Param Validation Failed", data: { parameter: "queryString", value: undefined, reason: "missing" } })
}

const queryStringsToFetchAThingCommand = (queryStrings: APIGatewayProxyEventQueryStringParameters): Either<ParamError, DoAThingCommand> => {
  const qsSessionId = queryStrings.sessionId
  if (qsSessionId == undefined) return Left({ message: "Param Validation Failed", data: { parameter: "queryStrings.sessionId", value: undefined, reason: "missing" } })

  const thingToDoToId = queryStrings.thingToDoToId
  if (thingToDoToId == undefined) return Left({ message: "Param Validation Failed", data: { parameter: "queryStrings.thingToFetchId", value: undefined, reason: "missing" } })

  return uuid(qsSessionId)
    .map(sessionId => { return { sessionId, thingToDoToId } })
    .toEither({ message: "Param Validation Failed", data: { parameter: "queryStrings.sessionId", value: qsSessionId, reason: "not uuid" } })
}

const eventToFetchCommand = (e: APIGatewayProxyEvent): Either<ParamError, DoAThingCommand> =>
  getQueryStrings(e)
    .chain(queryStringsToFetchAThingCommand)


describe('need to parse an event into a command', () => {
  it('will parse into the fetch command', () => {

    const sessionId = newUuid()
    const commandResult = eventToFetchCommand(validEvent(sessionId))
    expect(commandResult).toStrictEqual(Right({ sessionId: sessionId, thingToDoToId: 'dave' }))
  })

})


