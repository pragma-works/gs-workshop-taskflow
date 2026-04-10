import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { config } from '../config'
import db from '../db'

async function cleanAll() {
  await db.activityEvent.deleteMany()
  await db.comment.deleteMany()
  await db.cardLabel.deleteMany()
  await db.card.deleteMany()
  await db.label.deleteMany()
  await db.list.deleteMany()
  await db.boardMember.deleteMany()
  await db.board.deleteMany()
  await db.user.deleteMany()
}

export async function setupTestData() {
  await cleanAll()

  const password = await bcrypt.hash('password123', 10)

  const alice = await db.user.create({ data: { email: 'alice@test.com', password, name: 'Alice' } })
  const bob = await db.user.create({ data: { email: 'bob@test.com', password, name: 'Bob' } })
  const carol = await db.user.create({ data: { email: 'carol@test.com', password, name: 'Carol' } })

  const board = await db.board.create({ data: { name: 'Test Board' } })

  await db.boardMember.createMany({
    data: [
      { userId: alice.id, boardId: board.id, role: 'owner' },
      { userId: bob.id, boardId: board.id, role: 'member' },
    ],
  })

  const backlog = await db.list.create({ data: { name: 'Backlog', position: 0, boardId: board.id } })
  const inProgress = await db.list.create({ data: { name: 'In Progress', position: 1, boardId: board.id } })

  const card1 = await db.card.create({
    data: { title: 'Test Card 1', position: 0, listId: backlog.id, assigneeId: alice.id },
  })
  const card2 = await db.card.create({
    data: { title: 'Test Card 2', position: 1, listId: backlog.id },
  })

  await db.comment.create({
    data: { content: 'Test comment', cardId: card1.id, userId: alice.id },
  })

  return { alice, bob, carol, board, backlog, inProgress, card1, card2 }
}

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '1h' })
}

export async function cleanupTestData() {
  await cleanAll()
}

export { db as testDb }
