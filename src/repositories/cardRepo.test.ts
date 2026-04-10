import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as cardRepo from './cardRepo'
import prisma from '../db'

vi.mock('../db', () => ({
  default: {
    card: {
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    list: {
      findUnique: vi.fn(),
    },
    activityEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation(fn => fn(prisma)),
    comment: {
      create: vi.fn(),
    },
  }
}))

describe('cardRepo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('findCardById calls prisma.card.findUnique', async () => {
    await cardRepo.findCardById(1)
    expect(prisma.card.findUnique).toHaveBeenCalledWith({ where: { id: 1 } })
  })

  it('findCardWithDetails calls prisma.card.findUnique with include', async () => {
    await cardRepo.findCardWithDetails(2)
    expect(prisma.card.findUnique).toHaveBeenCalledWith({
      where: { id: 2 },
      include: {
        comments: true,
        labels: { include: { label: true } },
      },
    })
  })

  it('createCard calls prisma.card.create with correct data', async () => {
    prisma.card.count.mockResolvedValue(3)
    const data = { title: 'T', listId: 1 }
    await cardRepo.createCard(data)
    expect(prisma.card.create).toHaveBeenCalledWith({
      data: { title: 'T', description: undefined, listId: 1, assigneeId: undefined, position: 3 },
    })
  })

  it('findListById calls prisma.list.findUnique', async () => {
    await cardRepo.findListById(5)
    expect(prisma.list.findUnique).toHaveBeenCalledWith({ where: { id: 5 } })
  })

  it('moveCardWithActivity calls $transaction and updates card and event', async () => {
    const tx = prisma
    await cardRepo.moveCardWithActivity(1, 2, 0, 3, 4, 5)
    expect(prisma.$transaction).toHaveBeenCalled()
    expect(tx.card.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { listId: 2, position: 0 } })
    expect(tx.activityEvent.create).toHaveBeenCalledWith({
      data: { boardId: 5, actorId: 3, eventType: 'card_moved', cardId: 1, fromListId: 4, toListId: 2 },
    })
  })

  it('deleteCard calls prisma.card.delete', async () => {
    await cardRepo.deleteCard(7)
    expect(prisma.card.delete).toHaveBeenCalledWith({ where: { id: 7 } })
  })

  it('createComment calls prisma.comment.create', async () => {
    const data = { content: 'c', cardId: 1, userId: 2 }
    await cardRepo.createComment(data)
    expect(prisma.comment.create).toHaveBeenCalledWith({ data })
  })
})
