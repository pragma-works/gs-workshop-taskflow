import prisma from '../db'
import type { IUserRepository, PublicUserRow, AuthUserRow, CreateUserInput } from './types'

function toPublic(user: any): PublicUserRow {
  return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt }
}

export class PrismaUserRepository implements IUserRepository {
  async findById(id: number): Promise<PublicUserRow | null> {
    const user = await prisma.user.findUnique({ where: { id } })
    return user ? toPublic(user) : null
  }

  async findByEmail(email: string): Promise<AuthUserRow | null> {
    return prisma.user.findUnique({ where: { email } }) as Promise<AuthUserRow | null>
  }

  async create(data: CreateUserInput): Promise<PublicUserRow> {
    const user = await prisma.user.create({ data })
    return toPublic(user)
  }
}
