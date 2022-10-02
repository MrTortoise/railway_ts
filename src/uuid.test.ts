import { Just, Nothing } from "purify-ts/Maybe"
import { newUuid, uuid } from "./uuid"

describe('uuid is a parser that returns a maybe', () => {
  it('will return Just uuid with a valid uuid', () => {
    const expected = newUuid()
    const actual = uuid(expected)

    expect(actual).toStrictEqual(Just(expected))
  })

  it('will return nothing with invalid uuid', () => {
    const expected = 'dave'
    const actual = uuid(expected)

    expect(actual).toStrictEqual(Nothing)
  })
})