import prisma from '../db'

export async function listBoardActivity(boardId: number) {
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

  return events.map(({ actor, card, fromList, toList, ...event }) => ({
    ...event,
    actorName: actor.name,
    cardTitle: card?.title ?? null,
    fromListName: fromList?.name ?? null,
    toListName: toList?.name ?? null,
    timestamp: event.createdAt,
  }))
}
