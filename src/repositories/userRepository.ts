import prisma from '../db'

export async function createUser(email: string, password: string, name: string) {
  const user = await prisma.user.create({ data: { email, password, name } })
  const { password: _, ...safeUser } = user
  return safeUser
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } })
}

export async function findUserById(id: number) {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return null
  const { password: _, ...safeUser } = user
  return safeUser
}
