import 'dotenv/config'

interface AppConfig {
  readonly jwtSecret: string
  readonly port: number
}

function getRequiredStringEnv(name: 'JWT_SECRET'): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is required`)
  }

  return value
}

function getPort(): number {
  const value = process.env.PORT?.trim()
  if (!value) {
    return 3001
  }

  const port = Number(value)
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('PORT must be a positive integer')
  }

  return port
}

export const appConfig: AppConfig = {
  jwtSecret: getRequiredStringEnv('JWT_SECRET'),
  port: getPort(),
}
