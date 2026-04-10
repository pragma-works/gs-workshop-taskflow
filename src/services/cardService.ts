import prisma from '../db'
import { ActivityEvent } from '@prisma/client'

export interface MoveCardResult {
  ok: true
  event: ActivityEvent
}

export async function moveCard(
  cardId: number,
  targetListId: number,
  position: number,
  actorId: number
): Promise<MoveCardResult> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { list: true },
  })
  if (!card) throw Object.assign(new Error('Card not found'), { status: 404 })

  const targetList = await prisma.list.findUnique({ where: { id: targetListId } })
  if (!targetList) throw Object.assign(new Error('Target list not found'), { status: 404 })

  const fromListId = card.listId
  const boardId = card.list.boardId

  const [, event] = await prisma.$transaction([
    prisma.card.update({
      where: { id: cardId },
      data: { listId: targetListId, position },
    }),
    prisma.activityEvent.create({
      data: {
        boardId,
        actorId,
        eventType: 'card_moved',
        cardId,
        fromListId,
        toListId: targetListId,
      },
    }),
  ])

  return { ok: true, event }
}
