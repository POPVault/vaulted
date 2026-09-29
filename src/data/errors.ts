export type DataErrorCode =
  | "not_found"
  | "invalid_input"
  | "already_submitted"
  | "phase_closed"
  | "questionnaire_required"
  | "acknowledgment_required"
  | "documents_updated"
  | "documents_missing"
  | "documents_placeholder"
  | "sold_out"
  | "invalid_transition"
  | "sophisticated_cap"
  | "capacity";

export class DataError extends Error {
  readonly code: DataErrorCode;

  constructor(code: DataErrorCode, message?: string) {
    super(message ?? code);
    this.name = "DataError";
    this.code = code;
  }
}

export class AlreadySubmittedError extends DataError {
  constructor(message = "Already submitted") {
    super("already_submitted", message);
    this.name = "AlreadySubmittedError";
  }
}

/** Result of an operation that can be refused for a business reason. */
export type Result<T, C extends DataErrorCode> =
  | ({ ok: true } & T)
  | { ok: false; code: C };
