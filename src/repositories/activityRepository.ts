import prisma from '../db'

export const activityRepository = {
  async findByBoardId(boardId: number, limit?: number) {
    return prisma.activityEvent.findMany({
      where: { boardId },
      orderBy: { createdAt: 'desc' },
      ...(limit ? { take: limit } : {}),
      include: {
        user: { select: { id: true, name: true } },
        card: { select: { id: true, title: true } },
      },
    })
  },
}
