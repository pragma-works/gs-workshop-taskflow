import { type NextFunction, type Request, type Response } from 'express'
import { verifyAuthToken } from '../auth/jwt'

function getBearerToken(authorizationHeader?: string): string | null {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authorizationHeader.slice('Bearer '.length).trim()
  return token.length > 0 ? token : null
}

/**
 * Ensures the request is authenticated and stores the auth context on the request object.
 *
 * @param {Request} req - Incoming HTTP request.
 * @param {Response} res - Outgoing HTTP response.
 * @param {NextFunction} next - Express continuation callback.
 * @returns {void}
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = getBearerToken(req.headers.authorization)
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    req.auth = verifyAuthToken(token)
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}

/**
 * Reads the authenticated user identifier from a request that already passed auth middleware.
 *
 * @param {Request} req - Authenticated HTTP request.
 * @returns {number} Authenticated user identifier.
 */
export function getAuthenticatedUserId(req: Request): number {
  const userId = req.auth?.userId
  if (typeof userId !== 'number') {
    throw new Error('Authentication context is missing')
  }

  return userId
}
