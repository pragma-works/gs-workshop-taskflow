import prisma from '../db'

import { mapCardWithResolvedLabels } from './cardMappers'

export async function findCardWithDetails(cardId: number) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      comments: true,
      labels: {
        include: {
          label: true,
        },
      },
    },
  })

  if (!card) {
    return null
  }

  return mapCardWithResolvedLabels(card)
}

export async function createCardAtEnd(data: {
  title: string
  description?: string | null
  listId: number
  assigneeId?: number | null
}) {
  const position = await prisma.card.count({ where: { listId: data.listId } })

  return prisma.card.create({
    data: {
      title: data.title,
      description: data.description,
      listId: data.listId,
      assigneeId: data.assigneeId,
      position,
    },
  })
}

export async function findCardForMove(cardId: number) {
  return prisma.card.findUnique({
    where: { id: cardId },
    include: {
      list: {
        select: {
          boardId: true,
        },
      },
    },
  })
}

export async function findListById(listId: number) {
  return prisma.list.findUnique({
    where: { id: listId },
    select: {
      id: true,
      boardId: true,
      name: true,
    },
  })
}

export async function moveCardWithActivity(params: {
  cardId: number
  boardId: number
  actorId: number
  fromListId: number
  targetListId: number
  position: number
}) {
  return prisma.$transaction(async (tx) => {
    await tx.card.update({
      where: { id: params.cardId },
      data: {
        listId: params.targetListId,
        position: params.position,
      },
    })

    return tx.activityEvent.create({
      data: {
        boardId: params.boardId,
        actorId: params.actorId,
        eventType: 'card_moved',
        cardId: params.cardId,
        fromListId: params.fromListId,
        toListId: params.targetListId,
      },
    })
  })
}

export async function createComment(data: { content: string; cardId: number; userId: number }) {
  return prisma.comment.create({ data })
}

export async function deleteCardById(cardId: number) {
  return prisma.card.delete({ where: { id: cardId } })
}
