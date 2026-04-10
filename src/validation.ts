import { AppError } from './errors'

type StringOptions = {
  minLength?: number
  maxLength?: number
}

export function parsePositiveInt(value: unknown, fieldName: string): number {
  const numericValue = Number(value)
  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    throw new AppError(400, `Invalid ${fieldName}`)
  }
  return numericValue
}

export function nonNegativeInteger(value: unknown, fieldName: string): number {
  const numericValue = Number(value)
  if (!Number.isInteger(numericValue) || numericValue < 0) {
    throw new AppError(400, `Invalid ${fieldName}`)
  }
  return numericValue
}

export function optionalPositiveInt(value: unknown, fieldName: string): number | null {
  if (value === undefined || value === null || value === '') {
    return null
  }
  return parsePositiveInt(value, fieldName)
}

export function requireString(value: unknown, fieldName: string, options: StringOptions = {}): string {
  if (typeof value !== 'string') {
    throw new AppError(400, `Invalid ${fieldName}`)
  }

  const normalizedValue = value.trim()
  const minLength = options.minLength ?? 1
  const maxLength = options.maxLength ?? Number.MAX_SAFE_INTEGER
  if (normalizedValue.length < minLength || normalizedValue.length > maxLength) {
    throw new AppError(400, `Invalid ${fieldName}`)
  }

  return normalizedValue
}

export function optionalString(value: unknown, fieldName: string, options: StringOptions = {}): string | null {
  if (value === undefined || value === null) {
    return null
  }
  return requireString(value, fieldName, { ...options, minLength: 0 })
}

export function requireEmail(value: unknown, fieldName: string): string {
  const email = requireString(value, fieldName, { minLength: 5, maxLength: 320 }).toLowerCase()
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailPattern.test(email)) {
    throw new AppError(400, `Invalid ${fieldName}`)
  }
  return email
}