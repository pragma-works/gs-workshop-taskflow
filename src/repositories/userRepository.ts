import prisma from '../db'

export class UserRepository {
  async create(data: { email: string; password: string; name: string }) {
    return prisma.user.create({ data })
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } })
  }

  async findById(id: number) {
    return prisma.user.findUnique({ where: { id } })
  }
}
