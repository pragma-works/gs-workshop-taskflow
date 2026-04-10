import { Request } from 'express'
import * as jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET ?? 'super-secret-key-change-me'

/**
 * Extracts and verifies a Bearer JWT from the Authorization header.
 * @param req - Express request object
 * @returns {number} The authenticated user's ID
 * @throws {Error} If the header is missing or the token is invalid
 */
export function verifyToken(req: Request): number {
  const header = req.headers.authorization
  if (!header) throw new Error('No auth header')
  const token = header.replace('Bearer ', '')
  const payload = jwt.verify(token, JWT_SECRET) as { userId: number }
  return payload.userId
}

/**
 * Signs a JWT for a given user ID.
 * @param userId - The user's ID to embed in the token
 * @returns {string} A signed JWT string
 */
export function signToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}
