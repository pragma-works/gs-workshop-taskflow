import prisma from '../db'
import { User } from '@prisma/client'

export class UserRepository {
  async create(email: string, password: string, name: string): Promise<User> {
    return prisma.user.create({ data: { email, password, name } })
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } })
  }

  async findById(id: number) {
    return prisma.user.findUnique({ 
      where: { id },
      select: { id: true, email: true, name: true, createdAt: true }
    })
  }

  async findAll() {
    return prisma.user.findMany({
      select: { id: true, email: true, name: true, createdAt: true }
    })
  }
}

export default new UserRepository()
