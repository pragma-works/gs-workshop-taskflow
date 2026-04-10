import { BadRequestError } from '../errors/application-error'

/** Parses an integer route parameter. */
export function parseIntegerParameter(rawValue: string, parameterName: string): number {
  const parsedValue = Number.parseInt(rawValue, 10)
  if (!Number.isInteger(parsedValue)) {
    throw new BadRequestError(`Invalid ${parameterName}`, { [parameterName]: rawValue })
  }

  return parsedValue
}

/** Requires a request field to be a non-empty string. */
export function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new BadRequestError(`Invalid ${fieldName}`)
  }

  const trimmedValue = value.trim()
  if (trimmedValue.length === 0) {
    throw new BadRequestError(`Invalid ${fieldName}`)
  }

  return trimmedValue
}

/** Requires a request field to be an integer. */
export function requireInteger(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new BadRequestError(`Invalid ${fieldName}`)
  }

  return value
}

/** Parses an optional string request field. */
export function optionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  if (typeof value !== 'string') {
    throw new BadRequestError(`Invalid ${fieldName}`)
  }

  const trimmedValue = value.trim()
  return trimmedValue.length === 0 ? undefined : trimmedValue
}

/** Parses an optional integer request field. */
export function optionalInteger(value: unknown, fieldName: string): number | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  return requireInteger(value, fieldName)
}
