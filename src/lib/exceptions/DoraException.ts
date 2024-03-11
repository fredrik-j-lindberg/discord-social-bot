const typeOptions = {
  NotFound: "NotFound",
  NotDefined: "NotDefined",
  Unknown: "Unknown",
} as const;
type ExceptionType = keyof typeof typeOptions;

const severity = {
  Info: "Info",
  Warn: "Warn",
  Error: "Error",
} as const;
export type Severity = keyof typeof severity;

export class DoraException extends Error {
  static readonly Type = typeOptions;
  readonly severity: Severity;
  static readonly Severity = severity;
  readonly type: ExceptionType;
  readonly metadata?: Record<string, unknown>;

  constructor(
    message: string,
    type: ExceptionType,
    options?: {
      cause?: unknown;
      severity?: Severity;
      metadata?: Record<string, unknown>;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = "DoraException";
    this.type = type;
    this.severity = options?.severity || severity.Error;
    this.metadata = options?.metadata;
  }
}
