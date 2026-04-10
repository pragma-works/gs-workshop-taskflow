import prisma from '../db'

const ACTIVITY_INCLUDE = {
  actor: { select: { id: true, name: true } },
  card: { select: { id: true, title: true } },
  fromList: { select: { id: true, name: true } },
  toList: { select: { id: true, name: true } },
} as const

export async function getActivityForBoard(boardId: number) {
  return prisma.activityEvent.findMany({
    where: { boardId },
    orderBy: { createdAt: 'desc' },
    include: ACTIVITY_INCLUDE,
  })
}

export function formatEvents(events: any[]) {
  return events.map((e) => ({
    id: e.id,
    boardId: e.boardId,
    actorId: e.actorId,
    actorName: e.actor.name,
    eventType: e.eventType,
    cardId: e.cardId ?? null,
    cardTitle: e.card?.title ?? null,
    fromListName: e.fromList?.name ?? null,
    toListName: e.toList?.name ?? null,
    timestamp: e.createdAt,
  }))
}
