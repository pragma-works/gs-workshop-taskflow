import * as bcrypt from 'bcryptjs'
import * as userRepo from '../repositories/user.repository'
import { signToken } from '../middleware/auth'

export async function register(data: { email: string; password: string; name: string }) {
  const hashed = await bcrypt.hash(data.password, 10)
  const user = await userRepo.createUser({ ...data, password: hashed })
  const { password: _, ...userWithoutPassword } = user
  return userWithoutPassword
}

export async function login(email: string, password: string) {
  const user = await userRepo.findUserByEmail(email)
  if (!user) {
    throw Object.assign(new Error('Invalid credentials'), { status: 401 })
  }
  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    throw Object.assign(new Error('Invalid credentials'), { status: 401 })
  }
  const token = signToken(user.id)
  return { token }
}

export async function getUser(userId: number) {
  const user = await userRepo.findUserById(userId)
  if (!user) {
    throw Object.assign(new Error('Not found'), { status: 404 })
  }
  const { password: _, ...userWithoutPassword } = user
  return userWithoutPassword
}
