export interface Environment {
  readonly jwtSecret: string
  readonly port: number
}

/** Loads and validates runtime environment variables. */
export function loadEnvironment(processEnvironment: NodeJS.ProcessEnv = process.env): Environment {
  return {
    jwtSecret: readRequiredValue(processEnvironment, 'JWT_SECRET'),
    port: readPort(processEnvironment.PORT),
  }
}

function readRequiredValue(processEnvironment: NodeJS.ProcessEnv, key: 'JWT_SECRET'): string {
  const value = processEnvironment[key]
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${key} is required`)
  }

  return value
}

function readPort(rawPort: string | undefined): number {
  if (rawPort === undefined) {
    return 3001
  }

  const parsedPort = Number.parseInt(rawPort, 10)
  if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
    throw new Error('PORT must be a positive integer')
  }

  return parsedPort
}
