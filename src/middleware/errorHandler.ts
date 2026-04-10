import { Request, Response, NextFunction } from 'express'
import { logger } from '../logger'

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: 'Route not found' })
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    next(err)
    return
  }

  const message = err instanceof Error ? err.message : 'Unknown error'
  logger.error('Unhandled route error', {
    method: req.method,
    path: req.originalUrl,
    message,
  })

  res.status(500).json({ error: 'Internal server error' })
}
