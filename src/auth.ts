import { Request, Response, NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'

export const JWT_SECRET = process.env.JWT_SECRET ?? 'super-secret-key-change-me'

/**
 * Backward-compatible helper for routes that call verifyToken(req) inline.
 * Returns the userId from the JWT, throws on missing / invalid token.
 */
export function verifyToken(req: Request): number {
  const header = req.headers.authorization
  if (!header) throw new Error('No auth header')
  const token = header.replace('Bearer ', '')
  const payload = jwt.verify(token, JWT_SECRET) as { userId: number; name?: string }
  return payload.userId
}

/**
 * Express middleware.
 * Sets req.user = { id, name } on success; calls next() with 401 AppError on failure.
 * Use this in new routes instead of verifyToken().
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const token   = header.replace('Bearer ', '')
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; name: string }
    ;(req as any).user = { id: payload.userId, name: payload.name ?? '' }
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}
