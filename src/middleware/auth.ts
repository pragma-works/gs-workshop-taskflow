import { Request, Response, NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  userId: number
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const token = header.replace('Bearer ', '')
    const secret = process.env.JWT_SECRET
    if (!secret) throw new Error('JWT_SECRET not configured')
    const payload = jwt.verify(token, secret) as { userId: number }
    ;(req as AuthRequest).userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}
