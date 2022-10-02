
// import { Either, Left, Right } from "purify-ts/Either"
// import { Just, Maybe, Nothing } from "purify-ts/Maybe"
// import { EnvironmentError, SomeError } from "./errors"

// interface Config {
//   port: Maybe<string>
// }

// const failGetConfig = (): Maybe<Config> => Nothing
// const getConfig = (): Maybe<Config> => {
//   return Just({ port: Just('1234') })
// }

// const getPort = (f: () => Maybe<Config>): Either<EnvironmentError, string> => {
//   return f()
//     .chain(x => x.port)
//     .toEither({ message: "missing environment config", data: { config: 'port' } })
// }
// const portToNumber = (f: () => Maybe<Config>): Either<EnvironmentError, number> => {
//   return getPort(f)
//     .ifLeft((e) => error(e))
//     .map(parseInt)
// }

// // We want to be able to plug a function that takes some values and plug it into a chain of eithers
// // ti do this we need to wrap it in a function that can take an either
// // if the previous either is an error just return the error
// // if the either is Right then take that and pass it as the valueand return the either from the new function
// function bind<TInput, TOutput>(f: (a: TInput) => Either<SomeError, TOutput>) {
//   return (eitherInput: Either<SomeError, TInput>): Either<SomeError, TOutput> => {
//     if (eitherInput.isLeft()) {
//       return Left(eitherInput.extract())
//     } else {
//       return f(eitherInput.unsafeCoerce())
//     }
//   }
// }



