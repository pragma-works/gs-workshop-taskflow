import { NotFoundError, UnauthorizedError, ValidationError } from '../shared/errors'

export interface UserRecord {
  id: number
  email: string
  password: string
  name: string
  createdAt: Date
}

export interface PublicUser {
  id: number
  email: string
  name: string
  createdAt: Date
}

export interface RegisterUserInput {
  email: string
  password: string
  name: string
}

export interface LoginUserInput {
  email: string
  password: string
}

export interface UserRepository {
  createUser(input: RegisterUserInput & { password: string }): Promise<UserRecord>
  findByEmail(email: string): Promise<UserRecord | null>
  findById(userId: number): Promise<UserRecord | null>
}

export interface PasswordManager {
  hashPassword(password: string): Promise<string>
  comparePassword(password: string, hashedPassword: string): Promise<boolean>
}

export interface TokenIssuer {
  issueToken(userId: number): string
}

export interface UserService {
  registerUser(input: RegisterUserInput): Promise<PublicUser>
  loginUser(input: LoginUserInput): Promise<{ token: string }>
  getUserById(userId: number): Promise<PublicUser>
}

interface UserServiceDependencies {
  userRepository: UserRepository
  passwordManager: PasswordManager
  tokenIssuer: TokenIssuer
}

function requireNonEmptyString(value: string, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${fieldName} is required`)
  }

  return value.trim()
}

function requirePositiveInteger(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ValidationError(`Invalid ${fieldName}`)
  }

  return value
}

function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  }
}

/**
 * Creates user use cases backed by repository and auth-related ports.
 *
 * @param {UserServiceDependencies} dependencies - Repository and auth collaborators.
 * @returns {UserService} User service API.
 */
export function createUserService({
  userRepository,
  passwordManager,
  tokenIssuer,
}: UserServiceDependencies): UserService {
  return {
    async registerUser(input: RegisterUserInput): Promise<PublicUser> {
      const email = requireNonEmptyString(input.email, 'Email')
      const password = requireNonEmptyString(input.password, 'Password')
      const name = requireNonEmptyString(input.name, 'Name')
      const hashedPassword = await passwordManager.hashPassword(password)
      const user = await userRepository.createUser({ email, password: hashedPassword, name })
      return toPublicUser(user)
    },

    async loginUser(input: LoginUserInput): Promise<{ token: string }> {
      const email = requireNonEmptyString(input.email, 'Email')
      const password = requireNonEmptyString(input.password, 'Password')
      const user = await userRepository.findByEmail(email)

      if (!user) {
        throw new UnauthorizedError('Invalid credentials')
      }

      const isValid = await passwordManager.comparePassword(password, user.password)
      if (!isValid) {
        throw new UnauthorizedError('Invalid credentials')
      }

      return { token: tokenIssuer.issueToken(user.id) }
    },

    async getUserById(userId: number): Promise<PublicUser> {
      const normalizedUserId = requirePositiveInteger(userId, 'user id')
      const user = await userRepository.findById(normalizedUserId)

      if (!user) {
        throw new NotFoundError('Not found')
      }

      return toPublicUser(user)
    },
  }
}
