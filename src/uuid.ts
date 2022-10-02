import { Just, Maybe, Nothing } from "purify-ts"
import { v4 as uuidv4 } from 'uuid';

export type UUID = string
const regexUUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function uuid(input: string): Maybe<UUID> {
  return regexUUID.test(input) ? Just(input) : Nothing
}

export function newUuid(): UUID {
  return uuidv4()
}


