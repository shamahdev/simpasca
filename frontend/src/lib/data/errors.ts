/** Error thrown by the data layer; Server Actions turn it into form state. */
export class DataError extends Error {
  readonly code: "INVALID" | "NOT_FOUND" | "CONFLICT" | "UNAVAILABLE";
  readonly fieldErrors?: Record<string, string>;

  constructor(
    code: DataError["code"],
    message: string,
    fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export function invalidIfAny(errors: Record<string, string>, message: string) {
  if (Object.keys(errors).length > 0) throw new DataError("INVALID", message, errors);
}
