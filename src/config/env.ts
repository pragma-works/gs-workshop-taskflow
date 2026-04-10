import { AppError } from '../errors/app-error'

let cachedJwtSecret: string | null = null

export function getJwtSecret(): string {
  if (cachedJwtSecret) return cachedJwtSecret

  const value = process.env.JWT_SECRET
  if (!value) {
    throw new AppError('JWT_SECRET is required', 500)
  }

  cachedJwtSecret = value
  return cachedJwtSecret
}
