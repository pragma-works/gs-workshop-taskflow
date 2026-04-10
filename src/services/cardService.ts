import prisma from '../db'

export async function getCardById(id: number) {
  return prisma.card.findUnique({
    where: { id },
    include: {
      comments: true,
      labels: { include: { label: true } },
    },
  })
}

export async function getCardRaw(id: number) {
  return prisma.card.findUnique({ where: { id } })
}

export async function getListById(id: number) {
  return prisma.list.findUnique({ where: { id } })
}

export async function createCard(
  title: string,
  description: string | undefined,
  listId: number,
  assigneeId: number | undefined,
  boardId: number,
  actorId: number,
) {
  const count = await prisma.card.count({ where: { listId } })
  const card = await prisma.card.create({
    data: { title, description, listId, assigneeId, position: count },
  })
  await prisma.activityEvent.create({
    data: { boardId, actorId, eventType: 'card_created', cardId: card.id },
  })
  return card
}

export async function moveCard(
  cardId: number,
  fromListId: number,
  targetListId: number,
  position: number,
  boardId: number,
  actorId: number,
) {
  const [updatedCard, event] = await prisma.$transaction([
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
  return { card: updatedCard, event }
}

export async function addComment(
  content: string,
  cardId: number,
  userId: number,
  boardId: number,
) {
  const [comment] = await prisma.$transaction([
    prisma.comment.create({ data: { content, cardId, userId } }),
    prisma.activityEvent.create({
      data: { boardId, actorId: userId, eventType: 'card_commented', cardId },
    }),
  ])
  return comment
}

export async function deleteCard(id: number) {
  return prisma.card.delete({ where: { id } })
}
