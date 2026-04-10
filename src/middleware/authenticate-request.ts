import type { NextFunction, Request, RequestHandler, Response } from 'express'
import type { TokenService } from '../auth/token-service'
import { UnauthorizedError } from '../errors/application-error'

/** Creates auth middleware that stores the current user id on the request. */
export function authenticateRequest(tokenService: TokenService): RequestHandler {
  return (request: Request, _response: Response, next: NextFunction) => {
    try {
      const token = readBearerToken(request)
      request.authenticatedUserId = tokenService.verify(token).userId
      next()
    } catch (error) {
      next(error)
    }
  }
}

/** Reads the authenticated user id from a request previously handled by auth middleware. */
export function getAuthenticatedUserId(request: Request): number {
  if (request.authenticatedUserId === undefined) {
    throw new UnauthorizedError('Unauthorized')
  }

  return request.authenticatedUserId
}

function readBearerToken(request: Request): string {
  const authorizationHeader = request.headers.authorization
  if (authorizationHeader === undefined || !authorizationHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Unauthorized')
  }

  const token = authorizationHeader.slice('Bearer '.length).trim()
  if (token.length === 0) {
    throw new UnauthorizedError('Unauthorized')
  }

  return token
}
