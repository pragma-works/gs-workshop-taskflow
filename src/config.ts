function readStringEnv(name: string, fallback?: string): string {
  const value = process.env[name]?.trim() ?? fallback
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function readNumberEnv(name: string, fallback: number): number {
  const rawValue = process.env[name]?.trim()
  if (!rawValue) {
    return fallback
  }

  const numericValue = Number(rawValue)
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    throw new Error(`Invalid numeric environment variable: ${name}`)
  }

  return numericValue
}

export const config = {
  jwtSecret: readStringEnv('JWT_SECRET'),
  port: readNumberEnv('PORT', 3001),
}