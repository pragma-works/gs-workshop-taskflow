import prisma from '../db'

export async function getActivityForBoard(boardId: number) {
  const events = await prisma.activityEvent.findMany({
    where: { boardId },
    orderBy: { createdAt: 'desc' },
    include: {
      actor:    { select: { name: true } },
      card:     { select: { title: true } },
      fromList: { select: { name: true } },
      toList:   { select: { name: true } },
    },
  })

  // Map to flat response shape matching the API contract (README spec)
  return events.map(({ actor, card, fromList, toList, createdAt, ...rest }) => ({
    ...rest,
    actorName:    actor.name,
    cardTitle:    card?.title    ?? null,
    fromListName: fromList?.name ?? null,
    toListName:   toList?.name   ?? null,
    timestamp:    createdAt,          // spec uses "timestamp", not "createdAt"
  }))
}
