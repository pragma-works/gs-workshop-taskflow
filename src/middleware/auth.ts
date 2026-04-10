import { Request, Response, NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me'

export interface AuthRequest extends Request {
  userId?: number
}

export function verifyToken(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization
    if (!header) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    const token = header.replace('Bearer ', '')
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number }
    req.userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}

export function signToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}
