import { Prisma } from '@prisma/client'
import { ErrorRequestHandler } from 'express'

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, message)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message)
  }
}

function mapPrismaError(error: Prisma.PrismaClientKnownRequestError): AppError {
  switch (error.code) {
    case 'P2002':
      return new AppError(409, 'Conflict', error.message)
    case 'P2003':
      return new ValidationError('Invalid related resource reference')
    case 'P2025':
      return new NotFoundError()
    default:
      return new AppError(500, 'Internal server error', error.message)
  }
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    const payload: Record<string, string> = { error: error.message }
    if (error.details) {
      payload.details = error.details
    }
    res.status(error.statusCode).json(payload)
    return
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const appError = mapPrismaError(error)
    const payload: Record<string, string> = { error: appError.message }
    if (appError.details) {
      payload.details = appError.details
    }
    res.status(appError.statusCode).json(payload)
    return
  }

  const details = error instanceof Error ? error.message : 'Unknown error'
  res.status(500).json({ error: 'Internal server error', details })
}