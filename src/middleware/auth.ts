import { Request, Response, NextFunction, RequestHandler } from 'express'
import * as jwt from 'jsonwebtoken'

export function verifyToken(req: Request): number {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not configured')

  const header = req.headers.authorization
  if (!header) throw new Error('No auth header')

  const token = header.replace('Bearer ', '')
  const payload = jwt.verify(token, secret) as { userId: number }
  return payload.userId
}

export const requireAuth: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const userId = verifyToken(req)
    res.locals.userId = userId
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}
