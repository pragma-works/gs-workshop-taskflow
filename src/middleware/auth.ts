import { Request, Response, NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me'

/**
 * Verify JWT token from Authorization header
 * @param req Express request object
 * @returns User ID from token payload
 * @throws Error if token is invalid or missing
 */
export function verifyToken(req: Request): number {
  const header = req.headers.authorization
  if (!header) throw new Error('No auth header')
  const token = header.replace('Bearer ', '')
  const payload = jwt.verify(token, JWT_SECRET) as { userId: number }
  return payload.userId
}

/**
 * Express middleware to authenticate requests
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const userId = verifyToken(req)
    // Store userId in request for downstream handlers
    ;(req as any).userId = userId
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}

/**
 * Generate JWT token for a user
 * @param userId User ID to encode in token
 * @returns JWT token string
 */
export function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}
