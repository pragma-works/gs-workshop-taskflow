import * as jwt from 'jsonwebtoken'
import { getJwtSecret } from '../config/env'
import { AppError } from '../errors/app-error'

type TokenPayload = {
  userId: number
}

export function signAuthToken(userId: number): string {
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: '7d' })
}

export function verifyAuthToken(headerValue: string | undefined): number {
  if (!headerValue) {
    throw new AppError('Unauthorized', 401)
  }

  const token = headerValue.replace('Bearer ', '')

  try {
    const payload = jwt.verify(token, getJwtSecret()) as TokenPayload
    if (!payload?.userId) {
      throw new AppError('Unauthorized', 401)
    }
    return payload.userId
  } catch {
    throw new AppError('Unauthorized', 401)
  }
}
