import prisma from '../db'

/**
 * Repository for user persistence operations
 */
export class UserRepository {
  /**
   * Find a user by email
   * @param email User email
   * @returns User or null
   */
  async findByEmail(email: string) {
    return await prisma.user.findUnique({ where: { email } })
  }

  /**
   * Find a user by ID
   * @param id User ID
   * @returns User or null
   */
  async findById(id: number) {
    return await prisma.user.findUnique({ where: { id } })
  }

  /**
   * Create a new user
   * @param email User email
   * @param password Hashed password
   * @param name User name
   * @returns Created user
   */
  async create(email: string, password: string, name: string) {
    return await prisma.user.create({
      data: { email, password, name },
    })
  }
}
