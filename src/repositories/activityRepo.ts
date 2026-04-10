import prisma from '../db'

export async function checkMembership(userId: number, boardId: number) {
  return prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
}

export const activityInclude = {
  actor:    { select: { name: true } },
  card:     { select: { title: true } },
  fromList: { select: { name: true } },
  toList:   { select: { name: true } },
} as const

export type ActivityEventWithRelations = Awaited<
  ReturnType<typeof prisma.activityEvent.findMany<{ include: typeof activityInclude }>>
>[number]

export async function findBoardEvents(boardId: number): Promise<ActivityEventWithRelations[]> {
  return prisma.activityEvent.findMany({
    where:   { boardId },
    orderBy: { createdAt: 'desc' },
    include: activityInclude,
  })
}
