import type { AuthTokenPayload } from '../auth/jwt'

declare global {
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload
    }
  }
}

export {}
