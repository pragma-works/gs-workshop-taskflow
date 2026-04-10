import * as jwt from 'jsonwebtoken'
import * as bcrypt from 'bcryptjs'
import prisma from '../db'

const JWT_SECRET = 'super-secret-key-change-me'

export async function createUser(overrides?: { email?: string; name?: string; password?: string }) {
  const email = overrides?.email ?? 'test@example.com'
  const name = overrides?.name ?? 'Test User'
  const password = overrides?.password ?? 'password123'
  const hashed = await bcrypt.hash(password, 10)
  return prisma.user.create({ data: { email, password: hashed, name } })
}

export function authHeader(userId: number): string {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' })
  return `Bearer ${token}`
}

export async function createBoard(userId: number, name = 'Test Board') {
  const board = await prisma.board.create({ data: { name } })
  await prisma.boardMember.create({ data: { userId, boardId: board.id, role: 'owner' } })
  return board
}

export async function createList(boardId: number, name = 'Backlog', position = 0) {
  return prisma.list.create({ data: { name, boardId, position } })
}

export async function createCard(listId: number, title = 'Test Card', position = 0) {
  return prisma.card.create({ data: { title, listId, position } })
}
