import prisma from '../db'

export interface ActivityEventView {
  id: number
  boardId: number
  actorId: number
  eventType: string
  cardId: number | null
  fromListId: number | null
  toListId: number | null
  createdAt: Date
  actorName: string
  cardTitle: string | null
  fromListName: string | null
  toListName: string | null
}

export async function isBoardMember(userId: number, boardId: number): Promise<boolean> {
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
  return membership !== null
}

export async function getBoardActivity(boardId: number): Promise<ActivityEventView[]> {
  const events = await prisma.activityEvent.findMany({
    where: { boardId },
    orderBy: { createdAt: 'desc' },
    include: {
      actor: { select: { name: true } },
      card: { select: { title: true } },
      fromList: { select: { name: true } },
      toList: { select: { name: true } },
    },
  })

  return events.map((e) => ({
    id: e.id,
    boardId: e.boardId,
    actorId: e.actorId,
    eventType: e.eventType,
    cardId: e.cardId,
    fromListId: e.fromListId,
    toListId: e.toListId,
    createdAt: e.createdAt,
    actorName: e.actor.name,
    cardTitle: e.card?.title ?? null,
    fromListName: e.fromList?.name ?? null,
    toListName: e.toList?.name ?? null,
  }))
}
