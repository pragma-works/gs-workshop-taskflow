import { describe, it, expect, beforeAll, afterAll } from 'vitest'

process.env.DATABASE_URL = `file:./dev-${Date.now()}-${Math.floor(Math.random()*1e6)}.db`

import prisma from '../db'
import * as repo from '../repositories'

describe('activity feed', () => {
  let user: any
  let board: any
  let list: any
  let card: any

  beforeAll(async () => {
    // clean up tables
    await prisma.activityEvent.deleteMany()
    await prisma.comment.deleteMany()
    await prisma.cardLabel.deleteMany()
    await prisma.card.deleteMany()
    await prisma.list.deleteMany()
    await prisma.boardMember.deleteMany()
    await prisma.board.deleteMany()
    await prisma.user.deleteMany()

    user = await prisma.user.create({ data: { email: 'testuser@example.com', password: 'x', name: 'Test' } })
    board = await prisma.board.create({ data: { name: 'Test Board' } })
    await prisma.boardMember.create({ data: { userId: user.id, boardId: board.id, role: 'owner' } })
    list = await prisma.list.create({ data: { name: 'L1', position: 0, boardId: board.id } })
    card = await prisma.card.create({ data: { title: 'C1', position: 0, listId: list.id, assigneeId: user.id } })
  })

  afterAll(async () => {
    await prisma.activityEvent.deleteMany()
    await prisma.comment.deleteMany()
    await prisma.cardLabel.deleteMany()
    await prisma.card.deleteMany()
    await prisma.list.deleteMany()
    await prisma.boardMember.deleteMany()
    await prisma.board.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  it('createActivityEvent and findActivityEventsByBoard works', async () => {
    await repo.createActivityEvent({ boardId: board.id, userId: user.id, action: 'test_event', meta: { a: 1 } })
    const events = await repo.findActivityEventsByBoard(board.id)
    expect(events.length).toBeGreaterThanOrEqual(1)
    const ev = events[0]
    expect(ev.action).toBe('test_event')
    expect(ev.meta).toBeTruthy()
    const parsed = JSON.parse(ev.meta as string)
    expect(parsed.a).toBe(1)
  })

  it('moveCardWithActivity creates transactional event', async () => {
    const target = await prisma.list.create({ data: { name: 'L2', position: 1, boardId: board.id } })
    await repo.moveCardWithActivity(card.id, target.id, 0, user.id)
    const events = await repo.findActivityEventsByBoard(board.id)
    const moved = events.find((e: any) => e.action === 'card_moved')
    expect(moved).toBeTruthy()
    const meta = JSON.parse((moved!.meta) as string)
    expect(meta.fromListId).toBe(list.id)
    expect(meta.toListId).toBe(target.id)
  })

  it('createCommentWithActivity creates comment and event', async () => {
    const comment = await repo.createCommentWithActivity({ content: 'hello', cardId: card.id, userId: user.id })
    expect(comment).toBeTruthy()
    const events = await repo.findActivityEventsByBoard(board.id)
    const c = events.find((e: any) => e.action === 'comment_added')
    expect(c).toBeTruthy()
    const meta = JSON.parse((c!.meta) as string)
    expect(meta.commentId).toBeDefined()
  })
})
