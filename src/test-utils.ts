import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

/**
 * Creates an in-memory Prisma client for testing.
 * Uses SQLite :memory: so tests never touch prisma/dev.db.
 */
export function createTestPrismaClient() {
  return new PrismaClient({
    datasources: {
      db: { url: 'file::memory:?cache=shared' },
    },
  })
}

/**
 * Seeds test database with users, board, lists and cards.
 * Returns the created records so tests can reference their IDs.
 */
export async function seedTestDatabase(prisma: PrismaClient) {
  const password = await bcrypt.hash('password123', 10)

  const alice = await prisma.user.create({ data: { email: 'alice@test.com', password, name: 'Alice' } })
  const bob   = await prisma.user.create({ data: { email: 'bob@test.com',   password, name: 'Bob'   } })
  const carol = await prisma.user.create({ data: { email: 'carol@test.com', password, name: 'Carol' } })

  const board = await prisma.board.create({ data: { name: 'Test Board' } })

  await prisma.boardMember.createMany({
    data: [
      { userId: alice.id, boardId: board.id, role: 'owner'  },
      { userId: bob.id,   boardId: board.id, role: 'member' },
      { userId: carol.id, boardId: board.id, role: 'member' },
    ],
  })

  const backlog     = await prisma.list.create({ data: { name: 'Backlog',     position: 0, boardId: board.id } })
  const inProgress  = await prisma.list.create({ data: { name: 'In Progress', position: 1, boardId: board.id } })
  const done        = await prisma.list.create({ data: { name: 'Done',        position: 2, boardId: board.id } })

  const card1 = await prisma.card.create({ data: { title: 'First card',  position: 0, listId: backlog.id, assigneeId: alice.id } })
  const card2 = await prisma.card.create({ data: { title: 'Second card', position: 1, listId: backlog.id, assigneeId: bob.id   } })

  return {
    users:  { alice, bob, carol },
    board,
    lists:  { backlog, inProgress, done },
    cards:  { card1, card2 },
  }
}
