import dotenv from 'dotenv'

dotenv.config()

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'super-secret-key-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  nodeEnv: process.env.NODE_ENV || 'development',
}

// Warn if using default secret in production
if (config.nodeEnv === 'production' && config.jwtSecret === 'super-secret-key-change-me') {
  console.warn('⚠️  WARNING: Using default JWT secret in production! Set JWT_SECRET environment variable.')
}
