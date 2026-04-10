import { Request, Response, NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'

/** Authenticated request with userId extracted from JWT */
export interface AuthRequest extends Request {
  userId: number
}

/** JWT secret loaded from environment */
function getSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET environment variable is not set')
  return secret
}

/** Express middleware that verifies the JWT and attaches userId to the request */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const token = header.replace('Bearer ', '')
  try {
    const payload = jwt.verify(token, getSecret()) as { userId: number }
    ;(req as AuthRequest).userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}

/** Sign a JWT for the given userId */
export function signToken(userId: number): string {
  return jwt.sign({ userId }, getSecret(), { expiresIn: '7d' })
}
