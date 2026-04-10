import { type PrismaClient } from '@prisma/client'
import { type RegisterUserInput, type UserRecord, type UserRepository } from '../services/user-service'

/**
 * Creates a Prisma-backed implementation of the user repository port.
 *
 * @param {PrismaClient} databaseClient - Database client used for persistence.
 * @returns {UserRepository} User repository implementation.
 */
export function createUserRepository(databaseClient: PrismaClient): UserRepository {
  return {
    createUser(input: RegisterUserInput & { password: string }): Promise<UserRecord> {
      return databaseClient.user.create({ data: input })
    },

    findByEmail(email: string): Promise<UserRecord | null> {
      return databaseClient.user.findUnique({ where: { email } })
    },

    findById(userId: number): Promise<UserRecord | null> {
      return databaseClient.user.findUnique({ where: { id: userId } })
    },
  }
}
