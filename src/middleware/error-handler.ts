import { NextFunction, Request, Response } from 'express'
import { isAppError } from '../errors/app-error'

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not found' })
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (isAppError(error)) {
    res.status(error.statusCode).json({ error: error.message })
    return
  }

  console.error(error)
  res.status(500).json({ error: 'Internal server error' })
}
