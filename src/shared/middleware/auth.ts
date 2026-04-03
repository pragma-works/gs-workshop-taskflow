import { Request } from 'express'
import * as jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config/env'

/**
 * Extracts and verifies the Bearer JWT from the request.
 * @returns The authenticated userId encoded in the token.
 * @throws Error if the header is missing or the token is invalid.
 */
export function verifyToken(req: Request): number {
  const header = req.headers.authorization
  if (!header) throw new Error('No auth header')
  const token = header.replace('Bearer ', '')
  const payload = jwt.verify(token, JWT_SECRET) as { userId: number }
  return payload.userId
}
