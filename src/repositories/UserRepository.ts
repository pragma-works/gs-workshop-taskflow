import prisma from '../db'

export class UserRepository {
  /**
   * Get user by ID
   */
  static async getById(userId: number) {
    return prisma.user.findUnique({
      where: { id: userId },
    })
  }

  /**
   * Get user by email
   */
  static async getByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    })
  }

  /**
   * Create a new user
   */
  static async create(data: {
    email: string
    password: string
    name: string
  }) {
    return prisma.user.create({ data })
  }
}
