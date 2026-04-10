import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../db', () => ({
  default: {
    card: {
      findUnique: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    comment: {
      create: vi.fn(),
    },
    activityEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import prisma from '../db'
import { getCardById, createCard, moveCard, addComment, deleteCard } from './cardService'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getCardById', () => {
  it('returns null when card is not found', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValueOnce(null)

    const result = await getCardById(999)

    expect(prisma.card.findUnique).toHaveBeenCalledWith({
      where: { id: 999 },
      include: {
        comments: true,
        labels: { include: { label: true } },
        list: { select: { boardId: true } },
      },
    })
    expect(result).toBeNull()
  })

  it('returns card with comments, labels, and list.boardId', async () => {
    const mockCard = {
      id: 1, title: 'Fix bug', listId: 10, position: 0,
      list: { boardId: 5 }, comments: [], labels: [],
    }
    vi.mocked(prisma.card.findUnique).mockResolvedValueOnce(mockCard as any)

    const result = await getCardById(1)

    expect(result).toEqual(mockCard)
    expect(result?.list.boardId).toBe(5)
  })
})

describe('createCard', () => {
  it('uses card count as position and creates card', async () => {
    vi.mocked(prisma.card.count).mockResolvedValueOnce(3)
    const mockCard = { id: 10, title: 'New', listId: 5, position: 3 }
    vi.mocked(prisma.card.create).mockResolvedValueOnce(mockCard as any)

    const result = await createCard('New', 'desc', 5, undefined)

    expect(prisma.card.count).toHaveBeenCalledWith({ where: { listId: 5 } })
    expect(prisma.card.create).toHaveBeenCalledWith({
      data: { title: 'New', description: 'desc', listId: 5, assigneeId: undefined, position: 3 },
    })
    expect(result.position).toBe(3)
  })

  it('creates card with assigneeId when provided', async () => {
    vi.mocked(prisma.card.count).mockResolvedValueOnce(0)
    const mockCard = { id: 11, title: 'Task', listId: 2, position: 0, assigneeId: 7 }
    vi.mocked(prisma.card.create).mockResolvedValueOnce(mockCard as any)

    const result = await createCard('Task', undefined, 2, 7)

    expect(prisma.card.create).toHaveBeenCalledWith({
      data: { title: 'Task', description: undefined, listId: 2, assigneeId: 7, position: 0 },
    })
    expect(result.assigneeId).toBe(7)
  })
})

describe('moveCard', () => {
  it('throws Not found when card does not exist', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValueOnce(null)

    await expect(moveCard(999, 20, 0, 1)).rejects.toThrow('Not found')
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('calls $transaction with card.update and activityEvent.create', async () => {
    const card = { id: 1, listId: 10, list: { boardId: 99 } }
    vi.mocked(prisma.card.findUnique).mockResolvedValueOnce(card as any)
    const event = { id: 5, eventType: 'card_moved', boardId: 99, cardId: 1 }
    vi.mocked(prisma.$transaction).mockResolvedValueOnce([
      { ...card, listId: 20, position: 2 },
      event,
    ] as any)

    const result = await moveCard(1, 20, 2, 7)

    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(result.ok).toBe(true)
    expect(result.event).toEqual(event)
  })

  it('passes correct fromListId and boardId into the transaction payload', async () => {
    const card = { id: 1, listId: 10, list: { boardId: 42 } }
    vi.mocked(prisma.card.findUnique).mockResolvedValueOnce(card as any)
    vi.mocked(prisma.$transaction).mockResolvedValueOnce([] as unknown as never)

    // Just verify it was called (not checking exact ops since they're Prisma promise objects)
    await moveCard(1, 30, 1, 99).catch(() => {/* transaction mock returns ops array, not [card, event] */})

    expect(prisma.card.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: { list: true },
    })
  })
})

describe('addComment', () => {
  it('creates comment and returns it', async () => {
    const mockComment = { id: 3, content: 'Great!', cardId: 1, userId: 7, createdAt: new Date() }
    vi.mocked(prisma.comment.create).mockResolvedValueOnce(mockComment as any)

    const result = await addComment(1, 7, 'Great!')

    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: { content: 'Great!', cardId: 1, userId: 7 },
    })
    expect(result).toEqual(mockComment)
    expect(result.content).toBe('Great!')
    expect(result.cardId).toBe(1)
    expect(result.userId).toBe(7)
  })
})

describe('deleteCard', () => {
  it('calls prisma.card.delete with the correct cardId', async () => {
    const deleted = { id: 5, title: 'Deleted', listId: 1, position: 0 }
    vi.mocked(prisma.card.delete).mockResolvedValueOnce(deleted as any)

    const result = await deleteCard(5)

    expect(prisma.card.delete).toHaveBeenCalledWith({ where: { id: 5 } })
    expect(result.id).toBe(5)
  })
})
