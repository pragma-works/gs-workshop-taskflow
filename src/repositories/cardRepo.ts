import prisma from '../db'

export async function findCardById(id: number) {
  return prisma.card.findUnique({ where: { id } })
}

export async function findCardWithDetails(id: number) {
  const card = await prisma.card.findUnique({
    where: { id },
    include: {
      comments: true,
      labels: { include: { label: true } },
    },
  })

  if (!card) return null

  return {
    ...card,
    labels: card.labels.map(cl => cl.label),
  }
}

export async function createCard(data: { title: string; description?: string; listId: number; assigneeId?: number }) {
  const count = await prisma.card.count({ where: { listId: data.listId } })
  return prisma.card.create({
    data: {
      title: data.title,
      description: data.description,
      listId: data.listId,
      assigneeId: data.assigneeId,
      position: count,
    },
  })
}

export async function findListById(id: number) {
  return prisma.list.findUnique({ where: { id } })
}

export async function moveCardWithActivity(
  cardId: number,
  targetListId: number,
  position: number,
  actorId: number,
  fromListId: number,
  boardId: number,
) {
  return prisma.$transaction(async (tx) => {
    const card = await tx.card.update({
      where: { id: cardId },
      data: { listId: targetListId, position },
    })

    const event = await tx.activityEvent.create({
      data: {
        boardId,
        actorId,
        eventType: 'card_moved',
        cardId,
        fromListId,
        toListId: targetListId,
      },
    })

    return { card, event }
  })
}

export async function deleteCard(id: number) {
  return prisma.card.delete({ where: { id } })
}

export async function createComment(data: { content: string; cardId: number; userId: number }) {
  return prisma.comment.create({ data })
}
