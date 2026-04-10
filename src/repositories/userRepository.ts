import prisma from '../db'

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } })
}

export async function findUserById(id: number) {
  return prisma.user.findUnique({ where: { id } })
}

export async function createUser(data: { email: string; password: string; name: string }) {
  return prisma.user.create({ data })
}
