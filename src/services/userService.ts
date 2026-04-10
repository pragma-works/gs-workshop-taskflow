import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import prisma from '../db'

// Single Responsibility: user business logic only
// Dependency Inversion: routes depend on this abstraction, not on prisma directly

export async function registerUser(email: string, password: string, name: string) {
  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { email, password: hashed, name } })
  const { password: _, ...safeUser } = user
  return safeUser
}

export async function loginUser(email: string, password: string): Promise<{ token: string }> {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw new Error('Invalid credentials')

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) throw new Error('Invalid credentials')

  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('Server misconfiguration')

  const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '7d' })
  return { token }
}

export async function getUserById(id: number) {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return null
  const { password: _, ...safeUser } = user
  return safeUser
}
