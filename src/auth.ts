import type { Request } from 'express'
import jwt from 'jsonwebtoken'

import type { AppConfig } from './config'
import { AuthenticationError } from './errors'

interface TokenPayload {
  readonly userId: number
}

export interface TokenService {
  createToken(userId: number): string
  getUserIdFromRequest(request: Request): number
}

function getBearerToken(request: Request): string {
  const authorizationHeader = request.headers.authorization

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    throw new AuthenticationError()
  }

  const token = authorizationHeader.slice('Bearer '.length).trim()

  if (!token) {
    throw new AuthenticationError()
  }

  return token
}

export function createTokenService(config: AppConfig): TokenService {
  return {
    createToken(userId: number): string {
      return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '7d' })
    },

    getUserIdFromRequest(request: Request): number {
      const token = getBearerToken(request)

      try {
        const payload = jwt.verify(token, config.jwtSecret) as TokenPayload

        if (typeof payload.userId !== 'number') {
          throw new AuthenticationError()
        }

        return payload.userId
      } catch {
        throw new AuthenticationError()
      }
    },
  }
}
