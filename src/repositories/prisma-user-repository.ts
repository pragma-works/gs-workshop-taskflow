import type { PrismaClient, User } from '@prisma/client'
import type { RegisterUserRecord, UserRepository } from '../services/users-service'

/** Prisma implementation of user persistence operations. */
export class PrismaUserRepository implements UserRepository {
  /** @param prismaClient Prisma client instance for database access. */
  public constructor(private readonly prismaClient: PrismaClient) {}

  /** Persists a newly registered user. */
  public createUser(input: RegisterUserRecord): Promise<User> {
    return this.prismaClient.user.create({ data: input })
  }

  /** Finds a user by email address. */
  public findByEmail(email: string): Promise<User | null> {
    return this.prismaClient.user.findUnique({ where: { email } })
  }

  /** Finds a user by id. */
  public findById(userId: number): Promise<User | null> {
    return this.prismaClient.user.findUnique({ where: { id: userId } })
  }
}
