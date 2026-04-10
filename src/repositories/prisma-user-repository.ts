import type { PrismaClient } from '@prisma/client'
import type { UserRecord } from '../domain/models'
import type { RegisterUserRecord, UserRepository } from '../services/users-service'

/** Prisma implementation of user persistence operations. */
export class PrismaUserRepository implements UserRepository {
  /** @param prismaClient Prisma client instance for database access. */
  public constructor(private readonly prismaClient: PrismaClient) {}

  /** Persists a newly registered user. */
  public async createUser(input: RegisterUserRecord): Promise<UserRecord> {
    return this.prismaClient.user.create({ data: input })
  }

  /** Finds a user by email address. */
  public async findByEmail(email: string): Promise<UserRecord | null> {
    return this.prismaClient.user.findUnique({ where: { email } })
  }

  /** Finds a user by id. */
  public async findById(userId: number): Promise<UserRecord | null> {
    return this.prismaClient.user.findUnique({ where: { id: userId } })
  }
}
