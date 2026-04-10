export const config = {
  jwtSecret: process.env.JWT_SECRET ?? 'super-secret-key-change-me',
  port: parseInt(process.env.PORT ?? '3001', 10),
  jwtExpiresIn: '7d',
} as const
