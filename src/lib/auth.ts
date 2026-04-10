import type { Request } from 'express'
import * as jwt from 'jsonwebtoken'

import { HttpError } from './errors'

function getJwtSecret(): string {
  return process.env.JWT_SECRET ?? 'super-secret-key-change-me'
}

export function verifyToken(req: Request): number {
  const header = req.headers.authorization
  if (!header) {
    throw new HttpError(401, 'Unauthorized')
  }

  const token = header.replace('Bearer ', '')
  const payload = jwt.verify(token, getJwtSecret()) as { userId: number }
  return payload.userId
}

export function signUserToken(userId: number): string {
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: '7d' })
}
