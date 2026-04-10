import * as bcrypt from 'bcryptjs'
import { AppError } from '../errors/app-error'
import { signAuthToken } from '../auth/token'
import { createUser, findUserByEmail, findUserById } from '../repositories/user-repository'
import { requireString } from './http-input'

export async function registerUser(input: { email: unknown; password: unknown; name: unknown }) {
  const email = requireString(input.email, 'email')
  const password = requireString(input.password, 'password')
  const name = requireString(input.name, 'name')

  const hashedPassword = await bcrypt.hash(password, 10)
  const user = await createUser({ email, password: hashedPassword, name })

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  }
}

export async function loginUser(input: { email: unknown; password: unknown }) {
  const email = requireString(input.email, 'email')
  const password = requireString(input.password, 'password')

  const user = await findUserByEmail(email)
  if (!user) {
    throw new AppError('Invalid credentials', 401)
  }

  const validPassword = await bcrypt.compare(password, user.password)
  if (!validPassword) {
    throw new AppError('Invalid credentials', 401)
  }

  return { token: signAuthToken(user.id) }
}

export async function getUserProfile(userId: number) {
  const user = await findUserById(userId)
  if (!user) {
    throw new AppError('Not found', 404)
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  }
}
