const typeOptions = {
  NotFound: "NotFound",
  NotDefined: "NotDefined",
  Unknown: "Unknown",
} as const;
type ExceptionType = keyof typeof typeOptions;

const responsible = {
  External: "External",
  Internal: "Internal",
} as const;
type ResponsibleForException = keyof typeof responsible;

export class DoraException extends Error {
  static readonly Type = typeOptions;
  readonly responsible?: ResponsibleForException;
  static readonly Responsible = responsible;
  readonly type: ExceptionType;

  constructor(
    message: string,
    type: ExceptionType,
    options?: {
      cause?: unknown;
      responsible?: ResponsibleForException;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = "DoraException";
    this.type = type;
    this.responsible = options?.responsible;
  }
}
