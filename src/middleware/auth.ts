import { Request, Response, NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me'

export function verifyToken(req: Request): number {
  const header = req.headers.authorization
  if (!header) throw new Error('No auth header')

  const token = header.replace('Bearer ', '')
  const payload = jwt.verify(token, JWT_SECRET) as { userId: number }
  return payload.userId
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    req.userId = verifyToken(req)
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}

export function signAuthToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}

