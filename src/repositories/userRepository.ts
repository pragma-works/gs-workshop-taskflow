import prisma from '../db'

export const userRepository = {
  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } })
  },

  async findById(id: number) {
    return prisma.user.findUnique({ where: { id } })
  },

  async create(data: { email: string; password: string; name: string }) {
    return prisma.user.create({ data })
  },
}
