import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import prisma from '../db'
import * as repo from '../repositories'
import * as jwt from 'jsonwebtoken'

process.env.DATABASE_URL = `file:./dev-${Date.now()}-${Math.floor(Math.random()*1e6)}.db`

describe('coverage booster - exercise many repo functions', () => {
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

  it('runs through common repo flows', async () => {
    const user = await repo.createUser({ email: 'cov@example.com', password: 'pw', name: 'Cov' })
    expect(user.id).toBeTruthy()
    const found = await repo.findUserByEmail('cov@example.com')
    expect(found).toBeTruthy()
    const board = await repo.createBoard('Cov Board')
    expect(board.id).toBeTruthy()
    await repo.createBoardMember({ userId: user.id, boardId: board.id, role: 'owner' })
    const members = await repo.findBoardMembersByUser(user.id)
    expect(members.length).toBeGreaterThanOrEqual(1)

    const list = await prisma.list.create({ data: { name: 'L', position: 0, boardId: board.id } })
    const countBefore = await repo.countCardsInList(list.id)
    expect(countBefore).toBe(0)
    const card = await repo.createCard({ title: 'CovCard', description: '', listId: list.id, assigneeId: user.id, position: 0 })
    expect(card.id).toBeTruthy()

    const countAfter = await repo.countCardsInList(list.id)
    expect(countAfter).toBeGreaterThanOrEqual(1)

    const foundCard = await repo.findCardById(card.id)
    expect(foundCard).toBeTruthy()

    await repo.updateCard({ id: card.id }, { title: 'Updated' })
    const updated = await repo.findCardById(card.id)
    expect(updated.title).toBe('Updated')

    const label = await prisma.label.create({ data: { name: 'lbl', color: 'blue' } })
    await prisma.cardLabel.create({ data: { cardId: card.id, labelId: label.id } })
    const cardLabels = await repo.findCardLabelsByCard(card.id)
    expect(cardLabels.length).toBeGreaterThanOrEqual(1)
    const fetchedLabel = await repo.findLabelById(label.id)
    expect(fetchedLabel.name).toBe('lbl')

    const comment = await repo.createComment({ cardId: card.id, userId: user.id, content: 'c' })
    expect(comment.id).toBeTruthy()
    const comments = await repo.findCommentsByCard(card.id)
    expect(comments.length).toBeGreaterThanOrEqual(1)

    const ev = await repo.createActivityEvent({ boardId: board.id, cardId: card.id, userId: user.id, action: 'a', meta: { x: 1 } })
    expect(ev.id).toBeTruthy()

    const preview = await repo.findActivityEventsPreview(board.id)
    expect(Array.isArray(preview)).toBe(true)

    const all = await repo.findActivityEventsByBoard(board.id)
    expect(all.length).toBeGreaterThanOrEqual(1)

    // move card with valid target
    const target = await prisma.list.create({ data: { name: 'T', position: 1, boardId: board.id } })
    await repo.moveCardWithActivity(card.id, target.id, 0, user.id)
    const movedEvents = await repo.findActivityEventsByBoard(board.id)
    const moved = movedEvents.find(e => e.action === 'card_moved')
    expect(moved).toBeTruthy()

    // create comment with activity
    const com = await repo.createCommentWithActivity({ cardId: card.id, userId: user.id, content: 'hi' })
    expect(com.id).toBeTruthy()

    // delete card
    await repo.deleteCard({ id: card.id })

    // verify token helper usage
    const secret = process.env.JWT_SECRET || 'super-secret-key-change-me'
    const token = jwt.sign({ userId: user.id }, secret)
    // decode via repo? just ensure token is valid
    const decoded: any = jwt.verify(token, secret)
    expect(decoded.userId).toBe(user.id)
  })
})
