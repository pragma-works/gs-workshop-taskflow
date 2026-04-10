import prisma from '../db'
import * as bcrypt from 'bcryptjs'

export async function createUser(email: string, password: string, name: string) {
  const hashed = await bcrypt.hash(password, 10)
  return prisma.user.create({ data: { email, password: hashed, name } })
}

/** Returns the user if credentials are valid, null otherwise. */
export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return null
  const valid = await bcrypt.compare(password, user.password)
  return valid ? user : null
}

export async function findUserById(id: number) {
  return prisma.user.findUnique({ where: { id } })
}
