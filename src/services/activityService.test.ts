import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../db', () => ({
  default: {
    activityEvent: {
      findMany: vi.fn(),
    },
  },
}))

import prisma from '../db'
import { getActivityForBoard, formatEvents } from './activityService'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getActivityForBoard', () => {
  it('queries with correct boardId, orderBy desc, and all includes', async () => {
    vi.mocked(prisma.activityEvent.findMany).mockResolvedValueOnce([])

    await getActivityForBoard(42)

    expect(prisma.activityEvent.findMany).toHaveBeenCalledWith({
      where: { boardId: 42 },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { name: true } },
        card: { select: { title: true } },
        fromList: { select: { name: true } },
        toList: { select: { name: true } },
      },
    })
  })

  it('returns empty array when no events exist', async () => {
    vi.mocked(prisma.activityEvent.findMany).mockResolvedValueOnce([])

    const result = await getActivityForBoard(1)

    expect(result).toEqual([])
  })

  it('returns events from prisma unmodified', async () => {
    const events = [
      {
        id: 1, eventType: 'card_moved', createdAt: new Date('2024-06-01'),
        boardId: 5, cardId: 10, actorId: 2, fromListId: 1, toListId: 2,
        actor: { name: 'Alice' },
        card: { title: 'Fix bug' },
        fromList: { name: 'Backlog' },
        toList: { name: 'Done' },
      },
    ]
    vi.mocked(prisma.activityEvent.findMany).mockResolvedValueOnce(events as any)

    const result = await getActivityForBoard(5)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
    expect(result[0].actor.name).toBe('Alice')
  })
})

describe('formatEvents', () => {
  it('maps actorName, cardTitle, fromListName, toListName from relations', () => {
    const events = [
      {
        id: 1, eventType: 'card_moved', createdAt: new Date('2024-06-01'),
        boardId: 5, cardId: 10, actorId: 2, fromListId: 1, toListId: 2,
        actor: { name: 'Alice' },
        card: { title: 'Fix bug' },
        fromList: { name: 'Backlog' },
        toList: { name: 'Done' },
      },
    ] as Parameters<typeof formatEvents>[0]

    const result = formatEvents(events)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
    expect(result[0].eventType).toBe('card_moved')
    expect(result[0].boardId).toBe(5)
    expect(result[0].cardId).toBe(10)
    expect(result[0].actorName).toBe('Alice')
    expect(result[0].cardTitle).toBe('Fix bug')
    expect(result[0].fromListName).toBe('Backlog')
    expect(result[0].toListName).toBe('Done')
    expect(result[0].createdAt).toEqual(new Date('2024-06-01'))
  })

  it('returns null for cardTitle when card is null', () => {
    const events = [
      {
        id: 2, eventType: 'card_moved', createdAt: new Date(),
        boardId: 1, cardId: null, actorId: 1, fromListId: null, toListId: null,
        actor: { name: 'Bob' },
        card: null,
        fromList: null,
        toList: null,
      },
    ] as Parameters<typeof formatEvents>[0]

    const result = formatEvents(events)

    expect(result[0].cardTitle).toBeNull()
    expect(result[0].fromListName).toBeNull()
    expect(result[0].toListName).toBeNull()
    expect(result[0].cardId).toBeNull()
    expect(result[0].actorName).toBe('Bob')
  })

  it('handles mix of null and present optional fields', () => {
    const events = [
      {
        id: 3, eventType: 'card_moved', createdAt: new Date(),
        boardId: 7, cardId: 5, actorId: 1, fromListId: 2, toListId: null,
        actor: { name: 'Carol' },
        card: { title: 'Task' },
        fromList: { name: 'Todo' },
        toList: null,
      },
    ] as Parameters<typeof formatEvents>[0]

    const result = formatEvents(events)

    expect(result[0].cardTitle).toBe('Task')
    expect(result[0].fromListName).toBe('Todo')
    expect(result[0].toListName).toBeNull()
  })

  it('returns empty array for empty input', () => {
    const result = formatEvents([])
    expect(result).toEqual([])
  })
})
