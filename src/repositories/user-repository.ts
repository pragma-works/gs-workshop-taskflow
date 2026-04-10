import prisma from '../db'

export const userRepository = {
  createUser(data: { email: string; password: string; name: string }) {
    return prisma.user.create({ data })
  },

  findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } })
  },

  findUserById(id: number) {
    return prisma.user.findUnique({ where: { id } })
  },
}

export type UserRepository = typeof userRepository