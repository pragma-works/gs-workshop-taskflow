import prisma from '../db'

export async function getActivityForBoard(boardId: number) {
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
}

type ActivityEventResult = Awaited<ReturnType<typeof getActivityForBoard>>[number]

export function formatEvents(events: ActivityEventResult[]): {
  id: number
  eventType: string
  createdAt: Date
  boardId: number
  cardId: number | null
  actorName: string
  cardTitle: string | null
  fromListName: string | null
  toListName: string | null
}[] {
  return events.map((e) => ({
    id: e.id,
    eventType: e.eventType,
    createdAt: e.createdAt,
    boardId: e.boardId,
    cardId: e.cardId,
    actorName: e.actor.name,
    cardTitle: e.card?.title ?? null,
    fromListName: e.fromList?.name ?? null,
    toListName: e.toList?.name ?? null,
  }))
}
