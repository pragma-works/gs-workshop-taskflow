import { NextFunction, Request, Response } from 'express'
import { verifyAuthToken } from '../auth/token'

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const userId = verifyAuthToken(req.headers.authorization)
  req.authUserId = userId
  next()
}
