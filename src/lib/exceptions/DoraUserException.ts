import { DoraException, type Severity } from "./DoraException";

/**
 * Exception that is user facing, meaning when it bubbles up to a command or modal handler,
 * the message should be displayed in the form of an interaction reply etc
 */
export class DoraUserException extends DoraException {
  constructor(
    message: string,
    options?: {
      cause?: unknown;
      severity?: Severity;
      metadata?: Record<string, unknown>;
    },
  ) {
    super(message, DoraException.Type.UserFacing, options);
  }
}
