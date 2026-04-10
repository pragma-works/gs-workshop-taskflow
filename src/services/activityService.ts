import prisma from '../db'

export async function createActivityEvent(data: {
  boardId: number
  actorId: number
  eventType: string
  cardId?: number
  fromListId?: number
  toListId?: number
}) {
  return prisma.activityEvent.create({ data })
}

export async function getActivityForBoard(boardId: number) {
  return prisma.activityEvent.findMany({
    where: { boardId },
    orderBy: { createdAt: 'desc' },
    include: {
      actor: { select: { name: true } },
      card:  { select: { title: true } },
      fromList: { select: { name: true } },
      toList:   { select: { name: true } },
    },
  })
}
