import prisma from '../db'
import { ActivityEvent } from '@prisma/client'

export interface MoveCardResult {
  ok: true
  event: ActivityEvent
}

export async function getCardWithDetails(cardId: number) {
  return prisma.card.findUnique({
    where: { id: cardId },
    include: {
      comments: true,
      labels: { include: { label: true } },
    },
  })
}

export async function createCard(
  title: string,
  description: string | undefined,
  listId: number,
  assigneeId: number | undefined
) {
  const count = await prisma.card.count({ where: { listId } })
  return prisma.card.create({
    data: { title, description, listId, assigneeId, position: count },
  })
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

export async function addComment(cardId: number, userId: number, content: string) {
  return prisma.comment.create({ data: { content, cardId, userId } })
}

export async function deleteCard(cardId: number) {
  return prisma.card.delete({ where: { id: cardId } })
}
