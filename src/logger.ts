import { SomeError } from "./errors";

export const error = (message: SomeError): void => console.error(message.message, message.data)
