import { Request, Response, NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'
import { config } from '../config'

// Augment Express Request with authenticated userId
declare global {
  namespace Express {
    interface Request {
      userId?: number
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const token = header.replace('Bearer ', '')
    const payload = jwt.verify(token, config.jwtSecret) as { userId: number }
    req.userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}
