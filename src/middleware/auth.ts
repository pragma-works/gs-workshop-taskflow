import { Request, Response, NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me'

/**
 * Verify JWT token and extract userId
 */
export function verifyToken(req: Request): number {
  const header = req.headers.authorization
  if (!header) throw new Error('No auth header')
  const token = header.replace('Bearer ', '')
  const payload = jwt.verify(token, JWT_SECRET) as { userId: number }
  return payload.userId
}

/**
 * Express middleware to verify authentication
 * Adds userId to req.userId if valid, otherwise returns 401
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = verifyToken(req)
    ;(req as any).userId = userId
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}
