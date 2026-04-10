import { AppError } from '../errors/app-error'
import {
  countCardsInList,
  createCard,
  createComment,
  deleteCard,
  findBoardIdByCardId,
  findCardById,
  findCardWithDetails,
  runCardMoveTransaction,
} from '../repositories/card-repository'
import { isBoardMember } from '../repositories/board-repository'
import { requireString } from './http-input'

export async function getCard(cardId: number) {
  const card = await findCardWithDetails(cardId)
  if (!card) {
    throw new AppError('Not found', 404)
  }

  return {
    ...card,
    labels: card.labels.map(labelJoin => labelJoin.label),
  }
}

export async function createCardInList(input: {
  title: unknown
  description: unknown
  listId: unknown
  assigneeId: unknown
}) {
  const title = requireString(input.title, 'title')
  const listId = Number.parseInt(String(input.listId), 10)

  if (Number.isNaN(listId)) {
    throw new AppError('listId must be a number', 400)
  }

  const assigneeIdRaw = input.assigneeId
  const assigneeId = assigneeIdRaw === undefined || assigneeIdRaw === null
    ? undefined
    : Number.parseInt(String(assigneeIdRaw), 10)

  if (assigneeIdRaw !== undefined && assigneeIdRaw !== null && Number.isNaN(assigneeId)) {
    throw new AppError('assigneeId must be a number', 400)
  }

  const description = input.description === undefined || input.description === null
    ? undefined
    : String(input.description)

  const count = await countCardsInList(listId)
  return createCard({
    title,
    description,
    listId,
    assigneeId,
    position: count,
  })
}

export async function moveCardForUser(
  userId: number,
  cardId: number,
  input: { targetListId: unknown; position: unknown }
) {
  const card = await findCardById(cardId)
  if (!card) {
    throw new AppError('Not found', 404)
  }

  const boardId = await findBoardIdByCardId(card.id)
  if (!boardId) {
    throw new AppError('Card board not found', 404)
  }

  const member = await isBoardMember(userId, boardId)
  if (!member) {
    throw new AppError('Not a board member', 403)
  }

  const targetListId = Number.parseInt(String(input.targetListId), 10)
  const position = Number.parseInt(String(input.position), 10)
  if (Number.isNaN(targetListId) || Number.isNaN(position)) {
    throw new AppError('targetListId and position must be numbers', 400)
  }

  await runCardMoveTransaction(cardId, targetListId, position)
  return { ok: true }
}

export async function addCommentToCard(userId: number, cardId: number, input: { content: unknown }) {
  const content = requireString(input.content, 'content')

  const card = await findCardById(cardId)
  if (!card) {
    throw new AppError('Not found', 404)
  }

  return createComment(cardId, userId, content)
}

export async function deleteCardForUser(userId: number, cardId: number) {
  const boardId = await findBoardIdByCardId(cardId)
  if (!boardId) {
    throw new AppError('Not found', 404)
  }

  const member = await isBoardMember(userId, boardId)
  if (!member) {
    throw new AppError('Not a board member', 403)
  }

  await deleteCard(cardId)
  return { ok: true }
}
