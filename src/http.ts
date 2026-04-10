import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from 'express'

import type { TokenService } from './auth'
import { ApplicationError, ValidationError } from './errors'

type AsyncRouteHandler = (
  request: Request,
  response: Response,
  next: NextFunction,
) => Promise<void>

type AuthenticatedRouteHandler = (
  request: Request,
  response: Response,
  authenticatedUserId: number,
  next: NextFunction,
) => Promise<void>

export function asyncRoute(handler: AsyncRouteHandler): RequestHandler {
  return (request, response, next) => {
    void handler(request, response, next).catch(next)
  }
}

export function authenticatedRoute(
  tokenService: TokenService,
  handler: AuthenticatedRouteHandler,
): RequestHandler {
  return asyncRoute(async (request, response, next) => {
    const authenticatedUserId = tokenService.getUserIdFromRequest(request)
    await handler(request, response, authenticatedUserId, next)
  })
}

export function parseIdParameter(value: string, label: string): number {
  const parsedValue = Number.parseInt(value, 10)

  if (Number.isNaN(parsedValue)) {
    throw new ValidationError(`Invalid ${label}`)
  }

  return parsedValue
}

export function createErrorHandler(): ErrorRequestHandler {
  return (error, _request, response, _next) => {
    if (error instanceof ApplicationError) {
      response.status(error.statusCode).json({ error: error.message })
      return
    }

    console.error(error)
    response.status(500).json({ error: 'Internal Server Error' })
  }
}
