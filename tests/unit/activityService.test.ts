import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/db', () => ({
  default: {
    activityEvent: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    card: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import prisma from '../../src/db'
import {
  getActivityFeed,
  getActivityPreview,
  moveCardWithActivity,
} from '../../src/modules/activity/activityService'

const mockPrisma = prisma as unknown as {
  activityEvent: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }
  card: { update: ReturnType<typeof vi.fn> }
  $transaction: ReturnType<typeof vi.fn>
}

const sampleEvent = {
  id: 1,
  boardId: 10,
  cardId: 5,
  userId: 2,
  type: 'card_moved',
  payload: '{"fromListId":1,"toListId":2,"position":0}',
  createdAt: new Date('2024-01-01T00:00:00Z'),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getActivityFeed', () => {
  it('returns events ordered by createdAt desc', async () => {
    mockPrisma.activityEvent.findMany.mockResolvedValueOnce([sampleEvent])

    const result = await getActivityFeed(10)

    expect(mockPrisma.activityEvent.findMany).toHaveBeenCalledWith({
      where: { boardId: 10 },
      orderBy: { createdAt: 'desc' },
    })
    expect(result).toEqual([sampleEvent])
  })

  it('returns empty array when no events exist', async () => {
    mockPrisma.activityEvent.findMany.mockResolvedValueOnce([])
    const result = await getActivityFeed(99)
    expect(result).toEqual([])
  })
})

describe('getActivityPreview', () => {
  it('fetches at most 20 events by default', async () => {
    mockPrisma.activityEvent.findMany.mockResolvedValueOnce([sampleEvent])

    await getActivityPreview(10)

    expect(mockPrisma.activityEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20 }),
    )
  })

  it('respects a custom limit', async () => {
    mockPrisma.activityEvent.findMany.mockResolvedValueOnce([])

    await getActivityPreview(10, 5)

    expect(mockPrisma.activityEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 }),
    )
  })
})

describe('moveCardWithActivity', () => {
  it('executes a transaction and returns the created event', async () => {
    mockPrisma.$transaction.mockResolvedValueOnce([
      { id: 5, listId: 2, position: 0 },
      sampleEvent,
    ])

    const result = await moveCardWithActivity(5, 1, 2, 0, 2, 10)

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    expect(result).toEqual(sampleEvent)
  })

  it('calls $transaction with two operations', async () => {
    mockPrisma.$transaction.mockResolvedValueOnce([{}, sampleEvent])

    await moveCardWithActivity(5, 1, 2, 0, 2, 10)

    const [ops] = mockPrisma.$transaction.mock.calls[0] as [unknown[]]
    expect(ops).toHaveLength(2)
  })
})
