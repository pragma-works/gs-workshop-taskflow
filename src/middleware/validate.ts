import { HttpError } from '../errors/httpError'

type FieldSpec = {
  type: 'string' | 'number'
  optional?: boolean
  min?: number
  max?: number
}

type Schema = Record<string, FieldSpec>

/**
 * Validates a plain body object against a field spec, throws HttpError 400 on failure.
 * @param body Raw request body.
 * @param schema Validation schema.
 * @returns Validated body cast to the expected shape.
 */
export function validateBody<T extends Record<string, unknown>>(
  body: unknown,
  schema: Schema,
): T {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Request body must be a JSON object')
  }

  const errors: string[] = []
  const src = body as Record<string, unknown>

  for (const [field, spec] of Object.entries(schema)) {
    const value = src[field]

    if (value === undefined || value === null) {
      if (!spec.optional) {
        errors.push(`${field}: required`)
      }
      continue
    }

    if (spec.type === 'string') {
      if (typeof value !== 'string') {
        errors.push(`${field}: must be a string`)
        continue
      }
      if (spec.min !== undefined && value.length < spec.min) {
        errors.push(`${field}: must be at least ${spec.min} characters`)
      }
      if (spec.max !== undefined && value.length > spec.max) {
        errors.push(`${field}: must be at most ${spec.max} characters`)
      }
    }

    if (spec.type === 'number') {
      const num = typeof value === 'string' ? Number(value) : value
      if (typeof num !== 'number' || Number.isNaN(num)) {
        errors.push(`${field}: must be a number`)
        continue
      }
      if (spec.min !== undefined && (num as number) < spec.min) {
        errors.push(`${field}: must be >= ${spec.min}`)
      }
    }
  }

  if (errors.length > 0) {
    throw new HttpError(400, errors.join(', '))
  }

  return src as T
}
