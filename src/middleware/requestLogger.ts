import { Request, Response, NextFunction } from 'express'
import { logger } from '../logger'

function generateRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers['x-request-id']?.toString() || generateRequestId()
  const start = Date.now()

  res.setHeader('x-request-id', requestId)

  res.on('finish', () => {
    const durationMs = Date.now() - start
    logger.info('HTTP request', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
    })
  })

  next()
}
