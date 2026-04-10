import { NextFunction, Request, Response } from 'express'

export class AppError extends Error {
  statusCode: number
  details?: unknown

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.details = details
  }
}

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>

export function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void Promise.resolve(handler(req, res, next)).catch(next)
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err)
    return
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message, details: err.details })
    return
  }

  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
}