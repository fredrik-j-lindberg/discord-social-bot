const typeOptions = {
  NotFound: "NotFound",
  NotDefined: "NotDefined",
  Unknown: "Unknown",
  DateRange: "DateRange",
  TypeError: "TypeError",
} as const;
type ExceptionType = keyof typeof typeOptions;

const severity = {
  Info: "Info",
  Warn: "Warn",
  Error: "Error",
} as const;
export type Severity = keyof typeof severity;

const getCauseMetadata = (cause: unknown) => {
  if (cause instanceof Error) {
    return { ...cause, message: cause.message };
  }
};

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
    this.metadata = {
      ...options?.metadata,
      cause: getCauseMetadata(options?.cause),
    };
  }
}
