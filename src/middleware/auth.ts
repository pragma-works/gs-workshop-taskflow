import { NextFunction, Request, Response } from 'express'
import * as jwt from 'jsonwebtoken'
import { getJwtSecret } from '../config'

export interface AuthenticatedRequest extends Request {
  userId?: number
}

/**
 * @param req Express request.
 * @returns Authenticated user ID from token.
 * @throws Error when auth is missing/invalid.
 */
export function getUserIdFromRequest(req: Request): number {
  const header = req.headers.authorization
  if (!header) {
    throw new Error('No auth header')
  }

  const token = header.replace('Bearer ', '')
  const payload = jwt.verify(token, getJwtSecret()) as { userId: number }
  return payload.userId
}

/**
 * Express auth middleware for protected routes.
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    req.userId = getUserIdFromRequest(req)
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}
