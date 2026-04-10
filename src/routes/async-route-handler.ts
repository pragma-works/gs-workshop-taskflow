import type { NextFunction, Request, RequestHandler, Response } from 'express'

export type AsyncRouteCallback = (
  request: Request,
  response: Response,
  next: NextFunction,
) => Promise<void>

/** Wraps async route handlers so errors flow into Express error middleware. */
export function asyncRouteHandler(callback: AsyncRouteCallback): RequestHandler {
  return (request, response, next) => {
    void callback(request, response, next).catch(next)
  }
}
