import { PrismaClient } from '@prisma/client'
import { IUserRepository } from './IUserRepository'

export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: number) {
    return this.prisma.user.findUnique({ where: { id } })
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } })
  }

  create(data: { email: string; password: string; name: string }) {
    return this.prisma.user.create({ data })
  }
}
