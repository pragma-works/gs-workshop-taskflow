import * as jwt from 'jsonwebtoken'
import { Request } from 'express'

if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'test') {
  throw new Error('JWT_SECRET environment variable must be set')
}

export const JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-key-for-vitest'

export function verifyToken(req: Request): number {
  const header = req.headers.authorization
  if (!header) throw new Error('No auth header')
  const token = header.replace('Bearer ', '')
  const payload = jwt.verify(token, JWT_SECRET) as { userId: number }
  return payload.userId
}
