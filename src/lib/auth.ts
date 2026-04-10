import { Request } from 'express'
import * as jwt from 'jsonwebtoken'
import { config } from '../config'

export function verifyToken(req: Request): number {
  const header = req.headers.authorization
  if (!header) throw new Error('No auth header')
  const token = header.replace('Bearer ', '')
  const payload = jwt.verify(token, config.jwtSecret) as { userId: number }
  return payload.userId
}

export { config }
