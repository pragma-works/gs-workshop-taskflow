import prisma from '../db'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../middleware/auth'

export async function registerUser(email: string, password: string, name: string) {
  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { email, password: hashed, name } })
  const { password: _, ...safeUser } = user
  return safeUser
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return null
  const valid = await bcrypt.compare(password, user.password)
  if (!valid) return null
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
  return { token }
}

export async function getUserById(id: number) {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return null
  const { password: _, ...safeUser } = user
  return safeUser
}
