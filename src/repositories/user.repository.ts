import prisma from '../db'

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } })
}

export async function findUserById(userId: number) {
  return prisma.user.findUnique({ where: { id: userId } })
}

export async function createUser(data: { email: string; password: string; name: string }) {
  return prisma.user.create({ data })
}
