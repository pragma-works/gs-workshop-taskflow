import { Request, Response, NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  userId?: number
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const token = header.replace('Bearer ', '')
    const secret = process.env.JWT_SECRET ?? 'super-secret-key-change-me'
    const payload = jwt.verify(token, secret) as { userId: number }
    req.userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}
