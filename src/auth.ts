import { NextFunction, Request, Response } from 'express'
import * as jwt from 'jsonwebtoken'
import { config } from './config'
import { AppError } from './errors'

export interface AuthenticatedRequest extends Request {
  userId: number
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    next(new AppError(401, 'Unauthorized'))
    return
  }

  const token = header.slice('Bearer '.length).trim()
  if (!token) {
    next(new AppError(401, 'Unauthorized'))
    return
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload & { userId?: unknown }
    if (typeof payload.userId !== 'number') {
      throw new AppError(401, 'Unauthorized')
    }
    ;(req as AuthenticatedRequest).userId = payload.userId
    next()
  } catch {
    next(new AppError(401, 'Unauthorized'))
  }
}

export function getUserId(req: Request): number {
  const userId = (req as Partial<AuthenticatedRequest>).userId
  if (typeof userId !== 'number') {
    throw new AppError(500, 'Authenticated user context is missing')
  }
  return userId
}