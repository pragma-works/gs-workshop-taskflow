import prisma from '../db'

export async function findCardById(cardId: number) {
  return prisma.card.findUnique({ where: { id: cardId } })
}

export async function findCardWithDetails(cardId: number) {
  return prisma.card.findUnique({
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
}

export async function countCardsInList(listId: number) {
  return prisma.card.count({ where: { listId } })
}

export async function createCard(data: {
  title: string
  description?: string
  listId: number
  assigneeId?: number
  position: number
}) {
  return prisma.card.create({ data })
}

export async function moveCard(cardId: number, targetListId: number, position: number) {
  return prisma.card.update({ where: { id: cardId }, data: { listId: targetListId, position } })
}

export async function createComment(cardId: number, userId: number, content: string) {
  return prisma.comment.create({ data: { cardId, userId, content } })
}

export async function deleteCard(cardId: number) {
  return prisma.card.delete({ where: { id: cardId } })
}

export async function findBoardIdByCardId(cardId: number) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      list: {
        select: { boardId: true },
      },
    },
  })

  return card?.list.boardId ?? null
}

export async function runCardMoveTransaction(cardId: number, targetListId: number, position: number) {
  return prisma.$transaction(async tx => {
    const updatedCard = await tx.card.update({
      where: { id: cardId },
      data: { listId: targetListId, position },
    })

    return updatedCard
  })
}
