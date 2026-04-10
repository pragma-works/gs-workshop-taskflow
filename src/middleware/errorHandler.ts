import { NextFunction, Request, Response } from 'express'
import { HttpError } from '../errors'

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) {
    return
  }

  if (err instanceof HttpError) {
    const payload: { error: string; details?: string } = { error: err.message }
    if (err.details) {
      payload.details = err.details
    }
    res.status(err.status).json(payload)
    return
  }

  const message = err instanceof Error ? err.message : 'Unknown error'
  res.status(500).json({ error: 'Internal server error', details: message })
}
