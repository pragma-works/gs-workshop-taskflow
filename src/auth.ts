import { Request } from 'express'
import * as jwt from 'jsonwebtoken'

export const JWT_SECRET = process.env.JWT_SECRET ?? 'super-secret-key-change-me'

export function verifyToken(req: Request): number {
  const header = req.headers.authorization
  if (!header) throw new Error('No auth header')
  const token = header.replace('Bearer ', '')
  const payload = jwt.verify(token, JWT_SECRET) as { userId: number }
  return payload.userId
}
