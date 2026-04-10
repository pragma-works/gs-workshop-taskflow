import { Request } from 'express'
import * as jwt from 'jsonwebtoken'
import { config } from './config'
import { UnauthorizedError } from './errors'

type TokenPayload = { userId: number }

export function verifyToken(req: Request): number {
  const header = req.headers.authorization
  if (!header) {
    throw new UnauthorizedError()
  }

  const token = header.replace('Bearer ', '')
  const payload = jwt.verify(token, config.jwtSecret) as TokenPayload
  return payload.userId
}

export function signToken(userId: number): string {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '7d' })
}