import 'dotenv/config'

export interface AppConfig {
  readonly jwtSecret: string
  readonly port: number
}

function getRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} environment variable is required`)
  }

  return value
}

export function getAppConfig(): AppConfig {
  const port = Number.parseInt(process.env.PORT ?? '3001', 10)

  if (Number.isNaN(port) || port <= 0) {
    throw new Error('PORT environment variable must be a positive integer')
  }

  return {
    jwtSecret: getRequiredEnvironmentVariable('JWT_SECRET'),
    port,
  }
}
