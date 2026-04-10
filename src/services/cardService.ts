import prisma from '../db'
import type { Card, Comment } from '@prisma/client'

export async function getCardById(cardId: number) {
  return prisma.card.findUnique({
    where: { id: cardId },
    include: {
      comments: true,
      labels: { include: { label: true } },
      list: { select: { boardId: true } },
    },
  })
}

export async function createCard(
  title: string,
  description: string | undefined,
  listId: number,
  assigneeId?: number,
): Promise<Card> {
  const count = await prisma.card.count({ where: { listId } })
  return prisma.card.create({
    data: { title, description, listId, assigneeId, position: count },
  })
}

export async function moveCard(
  cardId: number,
  targetListId: number,
  position: number,
  actorId: number,
): Promise<{ ok: true; event: unknown }> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { list: true },
  })
  if (!card) throw new Error('Not found')

  const fromListId = card.listId
  const boardId = card.list.boardId

  const [, event] = await prisma.$transaction([
    prisma.card.update({
      where: { id: cardId },
      data: { listId: targetListId, position },
    }),
    prisma.activityEvent.create({
      data: {
        eventType: 'card_moved',
        cardId,
        fromListId,
        toListId: targetListId,
        actorId,
        boardId,
      },
    }),
  ])

  return { ok: true, event }
}

export async function addComment(
  cardId: number,
  userId: number,
  content: string,
): Promise<Comment> {
  return prisma.comment.create({ data: { content, cardId, userId } })
}

export async function deleteCard(cardId: number): Promise<Card> {
  return prisma.card.delete({ where: { id: cardId } })
}
