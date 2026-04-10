import * as jwt from 'jsonwebtoken'
import { config } from '../config'

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'file:taskflow-tests?mode=memory&cache=shared'
process.env.JWT_SECRET = config.jwtSecret

type AppModule = typeof import('../index')
type DbModule = typeof import('../db')

export type TestContext = {
  app: AppModule['default']
  prisma: DbModule['default']
}

export function createToken(userId: number) {
  return jwt.sign({ userId }, process.env.JWT_SECRET as string, { expiresIn: '7d' })
}

export async function loadTestContext(): Promise<TestContext> {
  const dbModule = await import('../db')
  const appModule = await import('../index')

  return {
    app: appModule.default,
    prisma: dbModule.default,
  }
}

export async function executeStatements(prisma: TestContext['prisma'], statements: string[]) {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement)
  }
}

export async function resetDatabase(prisma: TestContext['prisma']) {
  await executeStatements(prisma, [
    'PRAGMA foreign_keys = OFF',
    'DROP TABLE IF EXISTS "ActivityEvent"',
    'DROP TABLE IF EXISTS "Comment"',
    'DROP TABLE IF EXISTS "CardLabel"',
    'DROP TABLE IF EXISTS "Label"',
    'DROP TABLE IF EXISTS "Card"',
    'DROP TABLE IF EXISTS "List"',
    'DROP TABLE IF EXISTS "BoardMember"',
    'DROP TABLE IF EXISTS "Board"',
    'DROP TABLE IF EXISTS "User"',
    'PRAGMA foreign_keys = ON',
    'CREATE TABLE "User" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "email" TEXT NOT NULL, "password" TEXT NOT NULL, "name" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)',
    'CREATE UNIQUE INDEX "User_email_key" ON "User"("email")',
    'CREATE TABLE "Board" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "name" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)',
    `CREATE TABLE "BoardMember" ("userId" INTEGER NOT NULL, "boardId" INTEGER NOT NULL, "role" TEXT NOT NULL DEFAULT 'member', PRIMARY KEY ("userId", "boardId"), CONSTRAINT "BoardMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "BoardMember_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)`,
    'CREATE TABLE "List" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "name" TEXT NOT NULL, "position" INTEGER NOT NULL, "boardId" INTEGER NOT NULL, CONSTRAINT "List_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)',
    'CREATE TABLE "Card" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "title" TEXT NOT NULL, "description" TEXT, "position" INTEGER NOT NULL, "dueDate" DATETIME, "listId" INTEGER NOT NULL, "assigneeId" INTEGER, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Card_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "Card_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE)',
    'CREATE TABLE "Label" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "name" TEXT NOT NULL, "color" TEXT NOT NULL)',
    'CREATE TABLE "CardLabel" ("cardId" INTEGER NOT NULL, "labelId" INTEGER NOT NULL, PRIMARY KEY ("cardId", "labelId"), CONSTRAINT "CardLabel_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "CardLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)',
    'CREATE TABLE "Comment" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "content" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "cardId" INTEGER NOT NULL, "userId" INTEGER NOT NULL, CONSTRAINT "Comment_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)',
    'CREATE TABLE "ActivityEvent" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "boardId" INTEGER NOT NULL, "actorId" INTEGER NOT NULL, "eventType" TEXT NOT NULL, "cardId" INTEGER, "fromListId" INTEGER, "toListId" INTEGER, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ActivityEvent_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "ActivityEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "ActivityEvent_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT "ActivityEvent_fromListId_fkey" FOREIGN KEY ("fromListId") REFERENCES "List" ("id") ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT "ActivityEvent_toListId_fkey" FOREIGN KEY ("toListId") REFERENCES "List" ("id") ON DELETE SET NULL ON UPDATE CASCADE)'
  ])
}

export async function seedBoardFixture(prisma: TestContext['prisma']) {
  const user = await prisma.user.create({
    data: {
      email: 'alice@test.com',
      password: 'password123',
      name: 'Alice',
    },
  })

  const board = await prisma.board.create({ data: { name: 'Q2 Product Sprint' } })

  await prisma.boardMember.create({
    data: { userId: user.id, boardId: board.id, role: 'owner' },
  })

  const backlog = await prisma.list.create({
    data: { name: 'Backlog', position: 0, boardId: board.id },
  })

  const inProgress = await prisma.list.create({
    data: { name: 'In Progress', position: 1, boardId: board.id },
  })

  const card = await prisma.card.create({
    data: {
      title: 'Fix login redirect',
      position: 0,
      listId: backlog.id,
      assigneeId: user.id,
    },
  })

  return { user, board, backlog, inProgress, card }
}