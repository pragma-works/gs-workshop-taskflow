import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'

export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({
        error: 'Validation error',
        details: result.error.issues.map((e: import('zod').ZodIssue) => ({ field: e.path.join('.'), message: e.message })),
      })
      return
    }
    req.body = result.data
    next()
  }
}
