import { DoraException, Severity } from "./exceptions/DoraException";

export function assertIsDefined<T>(
  value: T,
  message: string,
  severity: Severity = DoraException.Severity.Error,
): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new DoraException(message, DoraException.Type.NotDefined, {
      severity,
    });
  }
}
