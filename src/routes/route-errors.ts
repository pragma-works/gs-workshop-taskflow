import { type NextFunction, type Request, type RequestHandler, type Response } from 'express'
import { AppError } from '../shared/errors'

export type AsyncRouteHandler = (req: Request, res: Response) => Promise<void>

/**
 * Wraps async route handlers and converts known application errors into JSON responses.
 *
 * @param {AsyncRouteHandler} handler - Async route handler to wrap.
 * @returns {RequestHandler} Express request handler.
 */
export function withRouteErrorHandling(handler: AsyncRouteHandler): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res)
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message })
        return
      }

      next(error)
    }
  }
}
