import prisma from '../db'
import * as bcrypt from 'bcryptjs'

/** Create a new user with hashed password */
export async function createUser(email: string, password: string, name: string) {
  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { email, password: hashed, name } })
  const { password: _, ...safe } = user
  return safe
}

/** Find a user by email (includes password for auth verification) */
export async function findByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } })
}

/** Find a user by id, excluding the password hash */
export async function findById(id: number) {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return null
  const { password: _, ...safe } = user
  return safe
}
