import { Response } from 'express'
import { HttpError } from '../errors/httpError'

/**
 * @param res Express response object.
 * @param error Unknown error from a try/catch block.
 */
export function handleError(res: Response, error: unknown): void {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ error: error.message })
    return
  }

  res.status(500).json({ error: 'Internal server error' })
}

/**
 * @param value Raw route param string.
 * @returns Parsed integer.
 */
export function parseIntParam(value: string): number {
  return Number.parseInt(value, 10)
}
