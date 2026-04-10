import type { PrismaClient } from '@prisma/client'

export interface CreateUserInput {
  readonly email: string
  readonly password: string
  readonly name: string
}

export interface StoredUser {
  readonly id: number
  readonly email: string
  readonly password: string
  readonly name: string
  readonly createdAt: Date
}

export interface UsersRepository {
  create(input: CreateUserInput): Promise<StoredUser>
  findByEmail(email: string): Promise<StoredUser | null>
  findById(id: number): Promise<StoredUser | null>
}

export function createUsersRepository(databaseClient: PrismaClient): UsersRepository {
  return {
    create(input: CreateUserInput): Promise<StoredUser> {
      return databaseClient.user.create({ data: input })
    },

    findByEmail(email: string): Promise<StoredUser | null> {
      return databaseClient.user.findUnique({ where: { email } })
    },

    findById(id: number): Promise<StoredUser | null> {
      return databaseClient.user.findUnique({ where: { id } })
    },
  }
}
