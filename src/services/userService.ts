import prisma from '../db'

export async function createUser(
  email: string,
  password: string,
  name: string,
): Promise<{ id: number; email: string; name: string; createdAt: Date }> {
  return prisma.user.create({
    data: { email, password, name },
    select: { id: true, email: true, name: true, createdAt: true },
  })
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } })
}

export async function findUserById(
  id: number,
): Promise<{ id: number; email: string; name: string; createdAt: Date } | null> {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, createdAt: true },
  })
}
