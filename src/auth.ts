import { Request } from 'express'
import * as jwt from 'jsonwebtoken'

export function verifyToken(req: Request): number {
  const header = req.headers.authorization
  if (!header) throw new Error('No auth header')
  const token = header.replace('Bearer ', '')
  const secret = process.env.JWT_SECRET ?? 'super-secret-key-change-me'
  const payload = jwt.verify(token, secret) as { userId: number }
  return payload.userId
}
