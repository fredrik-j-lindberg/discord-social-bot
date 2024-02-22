import { DoraException } from "./exceptions/DoraException";

export function assertIsDefined<T>(
  value: T,
  message: string,
  responsible = DoraException.Responsible.External,
): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new DoraException(message, DoraException.Type.NotDefined, {
      responsible,
    });
  }
}
