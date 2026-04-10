import prisma from '../db'
import { NotFoundError, ValidationError } from '../errors'
import { assertBoardMember } from './board-service'

function mapCard(card: {
  id: number
  title: string
  description: string | null
  position: number
  dueDate: Date | null
  listId: number
  assigneeId: number | null
  createdAt: Date
  comments: Array<{
    id: number
    content: string
    createdAt: Date
    cardId: number
    userId: number
  }>
  labels: Array<{ label: { id: number; name: string; color: string } }>
}) {
  return {
    id: card.id,
    title: card.title,
    description: card.description,
    position: card.position,
    dueDate: card.dueDate,
    listId: card.listId,
    assigneeId: card.assigneeId,
    createdAt: card.createdAt,
    comments: card.comments,
    labels: card.labels.map((cardLabel) => cardLabel.label),
  }
}

export async function getCardForUser(userId: number, cardId: number) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      list: true,
      comments: true,
      labels: {
        include: { label: true },
      },
    },
  })

  if (!card) {
    throw new NotFoundError('Not found')
  }

  await assertBoardMember(userId, card.list.boardId)

  return mapCard(card)
}

export async function createCardForUser(
  userId: number,
  payload: { title: string; description?: string; listId: number; assigneeId?: number }
) {
  const list = await prisma.list.findUnique({ where: { id: payload.listId } })
  if (!list) {
    throw new NotFoundError('List not found')
  }

  await assertBoardMember(userId, list.boardId)

  const count = await prisma.card.count({ where: { listId: payload.listId } })
  return prisma.card.create({
    data: {
      title: payload.title,
      description: payload.description,
      listId: payload.listId,
      assigneeId: payload.assigneeId,
      position: count,
    },
  })
}

export async function moveCardForUser(
  userId: number,
  cardId: number,
  targetListId: number,
  position: number
) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { list: true },
  })

  if (!card) {
    throw new NotFoundError('Not found')
  }

  await assertBoardMember(userId, card.list.boardId)

  const targetList = await prisma.list.findUnique({ where: { id: targetListId } })
  if (!targetList) {
    throw new NotFoundError('Target list not found')
  }

  if (targetList.boardId !== card.list.boardId) {
    throw new ValidationError('Target list must belong to the same board')
  }

  return prisma.$transaction(async (tx) => {
    await tx.card.update({
      where: { id: cardId },
      data: { listId: targetListId, position },
    })

    return tx.activityEvent.create({
      data: {
        boardId: card.list.boardId,
        actorId: userId,
        eventType: 'card_moved',
        cardId,
        fromListId: card.listId,
        toListId: targetListId,
      },
    })
  })
}

export async function addCommentForUser(userId: number, cardId: number, content: string) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { list: true },
  })

  if (!card) {
    throw new NotFoundError('Not found')
  }

  await assertBoardMember(userId, card.list.boardId)
  return prisma.comment.create({ data: { content, cardId, userId } })
}

export async function deleteCardForUser(userId: number, cardId: number) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { list: true },
  })

  if (!card) {
    throw new NotFoundError('Not found')
  }

  await assertBoardMember(userId, card.list.boardId)
  await prisma.card.delete({ where: { id: cardId } })
}