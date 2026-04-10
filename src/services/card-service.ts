import { NotFoundError, ValidationError } from '../errors'
import { CardRepository, cardRepository } from '../repositories/card-repository'
import { assertBoardMember } from './board-service'

type CardServiceDependencies = {
  cardRepository: CardRepository
}

const defaultDependencies: CardServiceDependencies = {
  cardRepository,
}

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

export async function getCardForUser(
  userId: number,
  cardId: number,
  dependencies: CardServiceDependencies = defaultDependencies
) {
  const card = await dependencies.cardRepository.findCardDetails(cardId)

  if (!card) {
    throw new NotFoundError('Not found')
  }

  await assertBoardMember(userId, card.list.boardId)

  return mapCard(card)
}

export async function createCardForUser(
  userId: number,
  payload: { title: string; description?: string; listId: number; assigneeId?: number },
  dependencies: CardServiceDependencies = defaultDependencies
) {
  const list = await dependencies.cardRepository.findListById(payload.listId)
  if (!list) {
    throw new NotFoundError('List not found')
  }

  await assertBoardMember(userId, list.boardId)

  const count = await dependencies.cardRepository.countCardsInList(payload.listId)
  return dependencies.cardRepository.createCard({
    title: payload.title,
    description: payload.description,
    listId: payload.listId,
    assigneeId: payload.assigneeId,
    position: count,
  })
}

export async function moveCardForUser(
  userId: number,
  cardId: number,
  targetListId: number,
  position: number,
  dependencies: CardServiceDependencies = defaultDependencies
) {
  const card = await dependencies.cardRepository.findCardWithList(cardId)

  if (!card) {
    throw new NotFoundError('Not found')
  }

  await assertBoardMember(userId, card.list.boardId)

  const targetList = await dependencies.cardRepository.findListById(targetListId)
  if (!targetList) {
    throw new NotFoundError('Target list not found')
  }

  if (targetList.boardId !== card.list.boardId) {
    throw new ValidationError('Target list must belong to the same board')
  }

  return dependencies.cardRepository.moveCardAndCreateActivity({
    cardId,
    position,
    targetListId,
    boardId: card.list.boardId,
    actorId: userId,
    fromListId: card.listId,
  })
}

export async function addCommentForUser(
  userId: number,
  cardId: number,
  content: string,
  dependencies: CardServiceDependencies = defaultDependencies
) {
  const card = await dependencies.cardRepository.findCardWithList(cardId)

  if (!card) {
    throw new NotFoundError('Not found')
  }

  await assertBoardMember(userId, card.list.boardId)
  return dependencies.cardRepository.createComment({ content, cardId, userId })
}

export async function deleteCardForUser(
  userId: number,
  cardId: number,
  dependencies: CardServiceDependencies = defaultDependencies
) {
  const card = await dependencies.cardRepository.findCardWithList(cardId)

  if (!card) {
    throw new NotFoundError('Not found')
  }

  await assertBoardMember(userId, card.list.boardId)
  await dependencies.cardRepository.deleteCard(cardId)
}