export class ApplicationError extends Error {
  public readonly statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.name = new.target.name
    this.statusCode = statusCode
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message = 'Unauthorized') {
    super(401, message)
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message = 'Forbidden') {
    super(403, message)
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message = 'Not found') {
    super(404, message)
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string) {
    super(400, message)
  }
}
