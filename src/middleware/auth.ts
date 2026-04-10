import { Request, Response, NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'

// Extend Express Request to carry the authenticated userId
export interface AuthRequest extends Request {
  userId: number
}

// Single Responsibility: this module only handles JWT verification
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const token = header.replace('Bearer ', '')
  const secret = process.env.JWT_SECRET
  if (!secret) {
    res.status(500).json({ error: 'Server misconfiguration' })
    return
  }

  try {
    const payload = jwt.verify(token, secret) as { userId: number }
    ;(req as AuthRequest).userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}
