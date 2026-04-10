import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }))
      })
      return
    }

    req.body = result.data
    next()
  }
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params)
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid parameters',
        details: result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }))
      })
      return
    }

    req.params = result.data as any
    next()
  }
}
