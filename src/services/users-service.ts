import bcrypt from 'bcryptjs'

import type { TokenService } from '../auth'
import { AuthenticationError, NotFoundError, ValidationError } from '../errors'
import type { StoredUser, UsersRepository } from '../repositories/users-repository'

export interface RegisterUserInput {
  readonly email: string
  readonly password: string
  readonly name: string
}

export interface PublicUser {
  readonly id: number
  readonly email: string
  readonly name: string
  readonly createdAt: Date
}

export interface UsersService {
  register(input: RegisterUserInput): Promise<PublicUser>
  login(email: string, password: string): Promise<{ token: string }>
  getById(userId: number): Promise<PublicUser>
}

function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  }
}

export function createUsersService(
  usersRepository: UsersRepository,
  tokenService: TokenService,
): UsersService {
  return {
    async register(input: RegisterUserInput): Promise<PublicUser> {
      if (!input.email || !input.password || !input.name) {
        throw new ValidationError('email, password, and name are required')
      }

      const passwordHash = await bcrypt.hash(input.password, 10)
      const createdUser = await usersRepository.create({
        email: input.email,
        password: passwordHash,
        name: input.name,
      })

      return toPublicUser(createdUser)
    },

    async login(email: string, password: string): Promise<{ token: string }> {
      if (!email || !password) {
        throw new ValidationError('email and password are required')
      }

      const user = await usersRepository.findByEmail(email)

      if (!user) {
        throw new AuthenticationError('Invalid credentials')
      }

      const hasValidPassword = await bcrypt.compare(password, user.password)

      if (!hasValidPassword) {
        throw new AuthenticationError('Invalid credentials')
      }

      return { token: tokenService.createToken(user.id) }
    },

    async getById(userId: number): Promise<PublicUser> {
      const user = await usersRepository.findById(userId)

      if (!user) {
        throw new NotFoundError('Not found')
      }

      return toPublicUser(user)
    },
  }
}
