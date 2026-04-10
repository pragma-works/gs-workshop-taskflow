export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (secret && secret.trim().length > 0) {
    return secret
  }

  if (process.env.NODE_ENV === 'test') {
    return 'test-secret'
  }

  throw new Error('JWT_SECRET is required')
}
