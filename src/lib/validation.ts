import { HttpError } from './errors'

export function readObjectBody(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new HttpError(400, 'Invalid request body')
  }

  return body as Record<string, unknown>
}

export function parseIdParam(rawValue: string | undefined, fieldName: string): number {
  const value = Number.parseInt(rawValue ?? '', 10)
  if (!Number.isInteger(value) || value <= 0) {
    throw new HttpError(400, `Invalid ${fieldName}`)
  }

  return value
}

export function parseRequiredString(rawValue: unknown, fieldName: string): string {
  if (typeof rawValue !== 'string') {
    throw new HttpError(400, `Invalid ${fieldName}`)
  }

  const value = rawValue.trim()
  if (value.length === 0) {
    throw new HttpError(400, `Invalid ${fieldName}`)
  }

  return value
}

export function parseOptionalString(rawValue: unknown, fieldName: string): string | null | undefined {
  if (rawValue === undefined || rawValue === null) {
    return rawValue
  }

  if (typeof rawValue !== 'string') {
    throw new HttpError(400, `Invalid ${fieldName}`)
  }

  return rawValue
}

export function parsePositiveInt(rawValue: unknown, fieldName: string): number {
  if (typeof rawValue !== 'number' || !Number.isInteger(rawValue) || rawValue <= 0) {
    throw new HttpError(400, `Invalid ${fieldName}`)
  }

  return rawValue
}

export function parseOptionalPositiveInt(rawValue: unknown, fieldName: string): number | null | undefined {
  if (rawValue === undefined || rawValue === null) {
    return rawValue
  }

  return parsePositiveInt(rawValue, fieldName)
}

export function parseNonNegativeInt(rawValue: unknown, fieldName: string): number {
  if (typeof rawValue !== 'number' || !Number.isInteger(rawValue) || rawValue < 0) {
    throw new HttpError(400, `Invalid ${fieldName}`)
  }

  return rawValue
}
