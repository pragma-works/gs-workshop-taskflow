import { Request, Response, NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'

export function verifyToken(req: Request): number {
  const header = req.headers.authorization
  if (!header) throw new Error('No auth header')
  const token = header.replace('Bearer ', '')
  const secret = process.env.JWT_SECRET || 'super-secret-key-change-me'
  const payload = jwt.verify(token, secret) as any
  return payload.userId
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    verifyToken(req)
    next()
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' })
  }
}
