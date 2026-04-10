const DEFAULT_PORT = 3001

/**
 * @returns The port configured for the HTTP server.
 */
export function getPort(): number {
  const rawPort = process.env.PORT
  if (!rawPort) {
    return DEFAULT_PORT
  }

  const parsedPort = Number(rawPort)
  if (Number.isNaN(parsedPort)) {
    return DEFAULT_PORT
  }

  return parsedPort
}

/**
 * @returns JWT secret from environment.
 * @throws Error when JWT_SECRET is missing.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET must be configured')
  }

  return secret
}
