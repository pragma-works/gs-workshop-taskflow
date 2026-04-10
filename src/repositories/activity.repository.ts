import prisma from '../db'

export async function createActivityEvent(data: {
  boardId: number
  cardId?: number
  userId: number
  action: string
  meta?: string
}) {
  return prisma.activityEvent.create({ data })
}

export async function findEventsByBoardId(boardId: number, limit?: number) {
  return prisma.activityEvent.findMany({
    where: { boardId },
    orderBy: { createdAt: 'desc' },
    ...(limit ? { take: limit } : {}),
  })
}
