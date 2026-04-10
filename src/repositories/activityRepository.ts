import prisma from '../db'

/** Get all activity events for a board, newest first */
export async function findByBoard(boardId: number) {
  return prisma.activityEvent.findMany({
    where: { boardId },
    orderBy: { createdAt: 'desc' },
  })
}
