import { Request, Response, NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'
import { config } from '../config'
import { AuthRequest } from '../types'

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const token = header.replace('Bearer ', '')
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { userId: number }
    req.userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}
