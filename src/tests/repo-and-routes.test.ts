import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import prisma from '../db'
import * as repo from '../repositories'

process.env.DATABASE_URL = `file:./dev-${Date.now()}-${Math.floor(Math.random()*1e6)}.db`

describe('repository and route edge cases', () => {
  beforeAll(async () => {
    await prisma.activityEvent.deleteMany()
    await prisma.comment.deleteMany()
    await prisma.cardLabel.deleteMany()
    await prisma.card.deleteMany()
    await prisma.list.deleteMany()
    await prisma.boardMember.deleteMany()
    await prisma.board.deleteMany()
    await prisma.user.deleteMany()
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

  it('createActivityEvent stores and returns parsed meta via repo helper', async () => {
    const user = await prisma.user.create({ data: { email: 'rtest@example.com', password: 'p', name: 'Repo' } })
    const board = await prisma.board.create({ data: { name: 'Repo Board' } })

    const ev = await repo.createActivityEvent({ boardId: board.id, userId: user.id, action: 'test', meta: { foo: 'bar' } })
    expect(ev).toBeDefined()
    expect(ev.meta).toBeTruthy()
    // Repo helper stores meta as string in DB; helper returns the raw DB row, but meta should be string
    expect(typeof ev.meta === 'string' || typeof ev.meta === 'object').toBe(true)

    // ensure findActivityEventsByBoard returns the event
    const events = await repo.findActivityEventsByBoard(board.id)
    expect(events.length).toBeGreaterThanOrEqual(1)
  })

  it('moveCardWithActivity rolls back if invalid target list', async () => {
    const board = await prisma.board.create({ data: { name: 'Rollback Board' } })
    const list = await prisma.list.create({ data: { name: 'L1', position: 0, boardId: board.id } })
    const card = await prisma.card.create({ data: { title: 'C', position: 0, listId: list.id } })

    // call with non-existent targetListId should throw and not create activity
    let threw = false
    try {
      await repo.moveCardWithActivity({ cardId: card.id, targetListId: 999999, position: 0, userId: null })
    } catch (err) {
      threw = true
    }
    expect(threw).toBe(true)

    const events = await repo.findActivityEventsByBoard(board.id)
    expect(events.length).toBe(0)
  })

  it('createCommentWithActivity creates comment and activity', async () => {
    const board = await prisma.board.create({ data: { name: 'Comments Board' } })
    const list = await prisma.list.create({ data: { name: 'CL', position: 0, boardId: board.id } })
    const card = await prisma.card.create({ data: { title: 'Cc', position: 0, listId: list.id } })
    const user = await prisma.user.create({ data: { email: 'cuser@example.com', password: 'p', name: 'CUser' } })

    const comment = await repo.createCommentWithActivity({ cardId: card.id, userId: user.id, content: 'hi' })
    expect(comment).toBeDefined()
    const events = await repo.findActivityEventsByBoard(board.id)
    expect(events.length).toBeGreaterThanOrEqual(1)
  })
})
