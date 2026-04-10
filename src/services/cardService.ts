import prisma from '../db'

// Single Responsibility: card business logic only

export async function getCardById(id: number) {
  return prisma.card.findUnique({
    where: { id },
    include: {
      comments: true,
      labels: { include: { label: true } },
    },
  })
}

export async function createCard(
  title: string,
  listId: number,
  description?: string,
  assigneeId?: number,
) {
  const count = await prisma.card.count({ where: { listId } })
  return prisma.card.create({
    data: { title, description, listId, assigneeId, position: count },
  })
}

export async function moveCard(cardId: number, targetListId: number, position: number) {
  return prisma.$transaction([
    prisma.card.update({ where: { id: cardId }, data: { listId: targetListId, position } }),
  ]).then(([card]) => card)
}

export async function addComment(cardId: number, userId: number, content: string) {
  return prisma.comment.create({ data: { content, cardId, userId } })
}

export async function deleteCard(cardId: number) {
  return prisma.card.delete({ where: { id: cardId } })
}
