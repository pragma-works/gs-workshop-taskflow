import * as jwt from 'jsonwebtoken'
import { UnauthorizedError } from '../errors/application-error'

export interface AuthTokenPayload {
  readonly userId: number
}

/** Signs and verifies JWTs for authenticated users. */
export class TokenService {
  /** @param jwtSecret Secret used to sign and verify tokens. */
  public constructor(private readonly jwtSecret: string) {}

  /** Creates a signed token for a user id. */
  public sign(userId: number): string {
    return jwt.sign({ userId }, this.jwtSecret, { expiresIn: '7d' })
  }

  /** Verifies a token and returns its typed payload. */
  public verify(token: string): AuthTokenPayload {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as jwt.JwtPayload & { userId?: unknown }
      if (typeof payload.userId !== 'number') {
        throw new UnauthorizedError('Unauthorized')
      }

      return { userId: payload.userId }
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error
      }

      throw new UnauthorizedError('Unauthorized')
    }
  }
}
