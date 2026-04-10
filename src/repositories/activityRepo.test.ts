import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as activityRepo from './activityRepo'
import prisma from '../db'

vi.mock('../db', () => ({
  default: {
    activityEvent: {
      findMany: vi.fn(),
    },
  }
}))

describe('activityRepo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('findActivityByBoard calls prisma.activityEvent.findMany', async () => {
    prisma.activityEvent.findMany.mockResolvedValue([])
    await activityRepo.findActivityByBoard(1)
    expect(prisma.activityEvent.findMany).toHaveBeenCalledWith({
      where: { boardId: 1 },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { name: true } },
        card: { select: { title: true } },
        fromList: { select: { name: true } },
        toList: { select: { name: true } },
      },
    })
  })
})
