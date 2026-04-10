/**
 * Domain error hierarchy.
 *
 * Services throw these; the global Express error handler in index.ts maps
 * AppError.statusCode directly to the HTTP response, so route handlers never
 * need instanceof checks — they just call next(err).
 */
export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
  ) {
    super(message)
    this.name = 'AppError'
    // Ensures instanceof works correctly after TypeScript transpilation.
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') { super(message, 404) }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') { super(message, 403) }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') { super(message, 400) }
}
