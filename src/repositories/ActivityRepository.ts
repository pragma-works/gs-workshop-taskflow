import prisma from '../db'
import { ActivityEvent } from '@prisma/client'

export class ActivityRepository {
  async findByBoardId(boardId: number) {
    return prisma.activityEvent.findMany({
      where: { boardId },
      include: {
        actor: { select: { name: true } },
        card: { select: { title: true } },
        fromList: { select: { name: true } },
        toList: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
  }
}

export default new ActivityRepository()