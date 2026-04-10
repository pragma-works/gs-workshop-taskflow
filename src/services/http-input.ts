import { AppError } from '../errors/app-error'

export function parseId(rawValue: string, fieldName: string): number {
  const parsed = Number.parseInt(rawValue, 10)
  if (Number.isNaN(parsed)) {
    throw new AppError(`${fieldName} must be a number`, 400)
  }

  return parsed
}

export function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError(`${fieldName} is required`, 400)
  }

  return value.trim()
}
