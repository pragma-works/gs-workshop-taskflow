import { beforeEach, afterAll } from 'vitest'
import prisma from '../db'

beforeEach(async () => {
  await prisma.cardLabel.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.card.deleteMany()
  await prisma.list.deleteMany()
  await prisma.boardMember.deleteMany()
  await prisma.board.deleteMany()
  await prisma.label.deleteMany()
  await prisma.user.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})
