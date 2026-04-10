import { Request, Response, NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'
import { config } from '../config'

export interface AuthRequest extends Request {
  userId?: number
}

export function verifyToken(req: Request): number {
  const header = req.headers.authorization
  if (!header) throw new Error('No auth header')
  
  const token = header.replace('Bearer ', '')
  const payload = jwt.verify(token, config.jwtSecret) as { userId: number }
  return payload.userId
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    req.userId = verifyToken(req)
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}
