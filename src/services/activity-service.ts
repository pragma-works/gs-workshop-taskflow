import prisma from '../db'
import { assertBoardMember } from './board-service'

type ActivityRecord = Awaited<ReturnType<typeof prisma.activityEvent.findMany>>[number]

function mapActivityEvent(event: ActivityRecord & {
  actor: { name: string }
  card: { title: string } | null
  fromList: { name: string } | null
  toList: { name: string } | null
}) {
  return {
    id: event.id,
    boardId: event.boardId,
    actorId: event.actorId,
    actorName: event.actor.name,
    eventType: event.eventType,
    cardTitle: event.card?.title ?? null,
    fromListName: event.fromList?.name ?? null,
    toListName: event.toList?.name ?? null,
    timestamp: event.createdAt,
  }
}

async function loadBoardActivity(boardId: number) {
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

  return events.map(mapActivityEvent)
}

export async function getBoardActivityForUser(userId: number, boardId: number) {
  await assertBoardMember(userId, boardId)
  return loadBoardActivity(boardId)
}

export async function getBoardActivityPreview(boardId: number) {
  return loadBoardActivity(boardId)
}