import prisma from '../db'

export const activityRepository = {
  async getBoardEvents(boardId: number) {
    return prisma.activityEvent.findMany({
      where: { boardId },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { name: true } },
        card: { select: { title: true } },
        fromList: { select: { name: true } },
        toList: { select: { name: true } },
      },
    })
  },
}
