import { Request } from 'express'
import * as jwt from 'jsonwebtoken'
import { getJwtSecret } from '../config'
import { HttpError } from '../errors'

export function verifyToken(req: Request): number {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    throw new HttpError(401, 'Unauthorized')
  }

  const token = header.slice('Bearer '.length)

  try {
    const payload = jwt.verify(token, getJwtSecret()) as { userId: number }
    return payload.userId
  } catch {
    throw new HttpError(401, 'Unauthorized')
  }
}
