import prisma from '../db'
import { IUserRepository } from '../types'

export const userRepository: IUserRepository = {
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
