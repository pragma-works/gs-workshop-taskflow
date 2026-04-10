import prisma from '../db'
import { User } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

/**
 * Creates a new user with a hashed password.
 * @param email - User's email address
 * @param password - Plain-text password (will be hashed)
 * @param name - User's display name
 * @returns {Promise<Omit<User, 'password'>>} The created user without password field
 */
export async function createUser(
  email: string,
  password: string,
  name: string,
): Promise<Omit<User, 'password'>> {
  const hashed = await bcrypt.hash(password, 10)
  const { password: _, ...user } = await prisma.user.create({
    data: { email, password: hashed, name },
  })
  return user
}

/**
 * Validates user credentials.
 * @param email - User's email
 * @param password - Plain-text password to check
 * @returns {Promise<User | null>} The user if credentials are valid, otherwise null
 */
export async function validateCredentials(email: string, password: string): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return null
  const valid = await bcrypt.compare(password, user.password)
  return valid ? user : null
}

/**
 * Finds a user by ID, returning all fields except password.
 * @param userId - The user's ID
 * @returns {Promise<Omit<User, 'password'> | null>} User without password or null
 */
export async function getUserById(userId: number): Promise<Omit<User, 'password'> | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return null
  const { password: _, ...rest } = user
  return rest
}
