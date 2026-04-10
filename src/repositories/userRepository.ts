import prisma from '../db'

export async function createUser(email: string, hashedPassword: string, name: string) {
  const user = await prisma.user.create({ data: { email, password: hashedPassword, name } })
  const { password: _, ...safe } = user
  return safe
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } })
}

export async function findUserById(id: number) {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return null
  const { password: _, ...safe } = user
  return safe
}
