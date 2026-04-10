import prisma from '../db'

export async function getActivityForBoard(boardId: number) {
  return prisma.activityEvent.findMany({
    where: { boardId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true } },
      card: { select: { id: true, title: true } },
    },
  })
}

export async function getActivityPreview(boardId: number, limit = 10) {
  return prisma.activityEvent.findMany({
    where: { boardId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: { select: { id: true, name: true } },
      card: { select: { id: true, title: true } },
    },
  })
}
