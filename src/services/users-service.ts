import * as bcrypt from 'bcryptjs'
import type { UserRecord } from '../domain/models'
import type { TokenService } from '../auth/token-service'
import { ConflictError, NotFoundError, UnauthorizedError } from '../errors/application-error'

export interface RegisterUserInput {
  readonly email: string
  readonly name: string
  readonly password: string
}

export interface LoginUserInput {
  readonly email: string
  readonly password: string
}

export interface PublicUser {
  readonly createdAt: Date
  readonly email: string
  readonly id: number
  readonly name: string
}

export interface UserRepository {
  createUser(input: RegisterUserRecord): Promise<UserRecord>
  findByEmail(email: string): Promise<UserRecord | null>
  findById(userId: number): Promise<UserRecord | null>
}

export interface RegisterUserRecord {
  readonly email: string
  readonly name: string
  readonly password: string
}

/** Handles user registration, login, and safe profile reads. */
export class UsersService {
  /** @param userRepository Persistence port for user data. @param tokenService JWT helper. */
  public constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
  ) {}

  /** Registers a user and returns the public profile. */
  public async registerUser(input: RegisterUserInput): Promise<PublicUser> {
    const existingUser = await this.userRepository.findByEmail(input.email)
    if (existingUser !== null) {
      throw new ConflictError('Email already in use', { email: input.email })
    }

    const passwordHash = await bcrypt.hash(input.password, 10)
    const user = await this.userRepository.createUser({
      email: input.email,
      name: input.name,
      password: passwordHash,
    })

    return toPublicUser(user)
  }

  /** Validates credentials and returns a bearer token. */
  public async loginUser(input: LoginUserInput): Promise<{ token: string }> {
    const user = await this.userRepository.findByEmail(input.email)
    if (user === null) {
      throw new UnauthorizedError('Invalid credentials', { email: input.email })
    }

    const validPassword = await bcrypt.compare(input.password, user.password)
    if (!validPassword) {
      throw new UnauthorizedError('Invalid credentials', { userId: user.id })
    }

    return { token: this.tokenService.sign(user.id) }
  }

  /** Returns a user profile without exposing password hashes. */
  public async getUserById(userId: number): Promise<PublicUser> {
    const user = await this.userRepository.findById(userId)
    if (user === null) {
      throw new NotFoundError('Not found', { userId })
    }

    return toPublicUser(user)
  }
}

function toPublicUser(user: UserRecord): PublicUser {
  return {
    createdAt: user.createdAt,
    email: user.email,
    id: user.id,
    name: user.name,
  }
}
