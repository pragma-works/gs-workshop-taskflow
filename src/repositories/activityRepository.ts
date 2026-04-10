import prisma from '../db'
import { IActivityRepository } from '../types'

export const activityRepository: IActivityRepository = {
  async create(data: { boardId: number; cardId?: number; userId: number; action: string; meta?: string }) {
    return prisma.activityEvent.create({ data })
  },

  async findByBoardId(boardId: number, limit?: number) {
    return prisma.activityEvent.findMany({
      where: { boardId },
      orderBy: { createdAt: 'desc' },
      ...(limit ? { take: limit } : {}),
    })
  },
}
