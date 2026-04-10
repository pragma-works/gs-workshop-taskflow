import * as jwt from 'jsonwebtoken'
import { appConfig } from '../config/env'

const TOKEN_EXPIRATION = '7d'

export interface AuthTokenPayload {
  userId: number
}

/**
 * Signs an auth token for the provided user identifier.
 *
 * @param {number} userId - Authenticated user identifier.
 * @returns {string} Signed JWT token.
 */
export function signAuthToken(userId: number): string {
  return jwt.sign({ userId }, appConfig.jwtSecret, { expiresIn: TOKEN_EXPIRATION })
}

/**
 * Verifies a JWT token and returns the validated auth payload.
 *
 * @param {string} token - Bearer token without the prefix.
 * @returns {AuthTokenPayload} Auth payload extracted from the token.
 */
export function verifyAuthToken(token: string): AuthTokenPayload {
  const payload = jwt.verify(token, appConfig.jwtSecret)

  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('userId' in payload) ||
    typeof payload.userId !== 'number'
  ) {
    throw new Error('Invalid token payload')
  }

  return { userId: payload.userId }
}
