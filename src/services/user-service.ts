import * as bcrypt from 'bcryptjs'
import prisma from '../db'
import { NotFoundError, UnauthorizedError } from '../errors'
import { signToken } from '../auth'

function sanitizeUser(user: {
  id: number
  email: string
  name: string
  createdAt: Date
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  }
}

export async function registerUser(email: string, password: string, name: string) {
  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { email, password: hashed, name } })
  return sanitizeUser(user)
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    throw new UnauthorizedError('Invalid credentials')
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    throw new UnauthorizedError('Invalid credentials')
  }

  return { token: signToken(user.id) }
}

export async function getUserById(id: number) {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    throw new NotFoundError('Not found')
  }

  return sanitizeUser(user)
}