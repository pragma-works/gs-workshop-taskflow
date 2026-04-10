import prisma from '../db'
import * as bcrypt from 'bcryptjs'

export async function createUser(data: { email: string; password: string; name: string }) {
  const hashed = await bcrypt.hash(data.password, 10)
  const { password: _pw, ...user } = await prisma.user.create({
    data: { ...data, password: hashed },
  })
  return user
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } })
}

export async function findUserById(id: number) {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return null
  const { password: _pw, ...safe } = user
  return safe
}
