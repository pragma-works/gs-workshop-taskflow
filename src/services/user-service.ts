import * as bcrypt from 'bcryptjs'
import { NotFoundError, UnauthorizedError } from '../errors'
import { UserRepository, userRepository } from '../repositories/user-repository'
import { signToken } from '../auth'

type UserServiceDependencies = {
  userRepository: UserRepository
  hashPassword: (password: string, saltOrRounds: number) => Promise<string>
  comparePassword: (password: string, hash: string) => Promise<boolean>
  signToken: (userId: number) => string
}

const defaultDependencies: UserServiceDependencies = {
  userRepository,
  hashPassword: bcrypt.hash,
  comparePassword: bcrypt.compare,
  signToken,
}

function sanitizeUser(user: {
  id: number
  email: string
  name: string
  createdAt: Date
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  }
}

export async function registerUser(
  email: string,
  password: string,
  name: string,
  dependencies: UserServiceDependencies = defaultDependencies
) {
  const hashed = await dependencies.hashPassword(password, 10)
  const user = await dependencies.userRepository.createUser({ email, password: hashed, name })
  return sanitizeUser(user)
}

export async function loginUser(
  email: string,
  password: string,
  dependencies: UserServiceDependencies = defaultDependencies
) {
  const user = await dependencies.userRepository.findUserByEmail(email)
  if (!user) {
    throw new UnauthorizedError('Invalid credentials')
  }

  const valid = await dependencies.comparePassword(password, user.password)
  if (!valid) {
    throw new UnauthorizedError('Invalid credentials')
  }

  return { token: dependencies.signToken(user.id) }
}

export async function getUserById(id: number, dependencies: UserServiceDependencies = defaultDependencies) {
  const user = await dependencies.userRepository.findUserById(id)
  if (!user) {
    throw new NotFoundError('Not found')
  }

  return sanitizeUser(user)
}