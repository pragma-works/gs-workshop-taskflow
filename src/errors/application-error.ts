export interface ErrorContext {
  readonly [key: string]: string | number | boolean | null | undefined
}

/** Base error for expected application failures that should reach clients. */
export class ApplicationError extends Error {
  public readonly statusCode: number
  public readonly context: ErrorContext

  /** @param message Human-readable error message. @param statusCode HTTP status. */
  public constructor(message: string, statusCode: number, context: ErrorContext = {}) {
    super(message)
    this.name = new.target.name
    this.statusCode = statusCode
    this.context = context
  }
}

/** Indicates invalid client input. */
export class BadRequestError extends ApplicationError {
  /** @param message Human-readable error message. @param context Error metadata. */
  public constructor(message: string, context: ErrorContext = {}) {
    super(message, 400, context)
  }
}

/** Indicates missing or invalid authentication. */
export class UnauthorizedError extends ApplicationError {
  /** @param message Human-readable error message. @param context Error metadata. */
  public constructor(message: string, context: ErrorContext = {}) {
    super(message, 401, context)
  }
}

/** Indicates a caller does not have permission for the operation. */
export class ForbiddenError extends ApplicationError {
  /** @param message Human-readable error message. @param context Error metadata. */
  public constructor(message: string, context: ErrorContext = {}) {
    super(message, 403, context)
  }
}

/** Indicates a requested resource does not exist. */
export class NotFoundError extends ApplicationError {
  /** @param message Human-readable error message. @param context Error metadata. */
  public constructor(message: string, context: ErrorContext = {}) {
    super(message, 404, context)
  }
}

/** Indicates a write conflicts with current persisted state. */
export class ConflictError extends ApplicationError {
  /** @param message Human-readable error message. @param context Error metadata. */
  public constructor(message: string, context: ErrorContext = {}) {
    super(message, 409, context)
  }
}

/** Checks whether an unknown error is one of the expected application errors. */
export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError
}
