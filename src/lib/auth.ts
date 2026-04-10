import type { Request } from 'express'
import * as jwt from 'jsonwebtoken'

import { HttpError } from './errors'

const DEFAULT_JWT_SECRET = 'super-secret-key-change-me'

function getJwtSecret(): string {
  const configuredSecret = process.env.JWT_SECRET?.trim()
  return configuredSecret && configuredSecret.length > 0
    ? configuredSecret
    : DEFAULT_JWT_SECRET
}

function getBearerToken(header: string | undefined): string {
  if (!header || !header.startsWith('Bearer ')) {
    throw new HttpError(401, 'Unauthorized')
  }

  const token = header.slice('Bearer '.length).trim()
  if (token.length === 0) {
    throw new HttpError(401, 'Unauthorized')
  }

  return token
}

function isAuthPayload(payload: string | jwt.JwtPayload): payload is jwt.JwtPayload & { userId: number } {
  return typeof payload === 'object'
    && payload !== null
    && typeof payload.userId === 'number'
    && Number.isInteger(payload.userId)
    && payload.userId > 0
}

export function verifyToken(req: Request): number {
  try {
    const token = getBearerToken(req.headers.authorization)
    const payload = jwt.verify(token, getJwtSecret())

    if (!isAuthPayload(payload)) {
      throw new HttpError(401, 'Unauthorized')
    }

    return payload.userId
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      throw error
    }

    throw new HttpError(401, 'Unauthorized')
  }
}

export function signUserToken(userId: number): string {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new HttpError(500, 'Invalid token subject')
  }

  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: '7d' })
}
