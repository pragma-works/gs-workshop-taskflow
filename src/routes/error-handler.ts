import type { ErrorRequestHandler, RequestHandler } from 'express'
import { isApplicationError } from '../errors/application-error'

/** Returns a JSON 404 response for unmatched routes. */
export const notFoundHandler: RequestHandler = (_request, response) => {
  response.status(404).json({ error: 'Not found' })
}

/** Converts thrown errors into JSON HTTP responses. */
export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (isApplicationError(error)) {
    response.status(error.statusCode).json({ error: error.message })
    return
  }

  console.error(error)
  response.status(500).json({ error: 'Internal server error' })
}
