import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { getJwtSecret } from '../config'
import { HttpError } from '../errors/httpError'
import {
  addBoardMember,
  countCardsInList,
  createBoardWithOwner,
  createCard,
  createCommentAndLogEvent,
  createUser,
  deleteCard,
  findBoardActivity,
  findBoardById,
  findBoardsByMember,
  findBoardWithDetails,
  findCardByIdWithDetails,
  findCardWithList,
  findUserByEmail,
  findUserById,
  isBoardMember,
  isBoardOwner,
  moveCardAndLogEvent,
} from '../repositories/taskflowRepository'

/**
 * @param userId Authenticated user ID.
 * @returns Boards for the user.
 */
export function getBoardsForUser(userId: number) {
  return findBoardsByMember(userId)
}

/**
 * @param userId Authenticated user ID.
 * @param boardId Target board ID.
 * @returns Board payload with nested list/card/comment/label data.
 */
export async function getBoardByIdForUser(userId: number, boardId: number) {
  const member = await isBoardMember(userId, boardId)
  if (!member) {
    // Could be 403 or 404 — check existence to distinguish
    const board = await findBoardById(boardId)
    if (!board) {
      throw new HttpError(404, 'Board not found')
    }
    throw new HttpError(403, 'Not a board member')
  }

  const boardWithDetails = await findBoardWithDetails(boardId)
  if (!boardWithDetails) {
    throw new HttpError(404, 'Board not found')
  }

  const lists = boardWithDetails.lists.map((list) => ({
    ...list,
    cards: list.cards.map((card) => ({
      ...card,
      labels: card.labels.map((entry) => entry.label),
    })),
  }))

  return {
    ...boardWithDetails,
    lists,
  }
}

/**
 * @param userId Authenticated user ID.
 * @param name Board name.
 */
export function createBoardForUser(userId: number, name: string) {
  return createBoardWithOwner(name, userId)
}

/**
 * @param userId Current user.
 * @param boardId Board ID.
 * @param memberId User to add as member.
 */
export async function addMemberToBoard(userId: number, boardId: number, memberId: number) {
  const isOwner = await isBoardOwner(userId, boardId)
  if (!isOwner) {
    throw new HttpError(403, 'Not a board member')
  }

  await addBoardMember(boardId, memberId)
}

/**
 * @param userId Authenticated user.
 * @param boardId Board ID.
 * @returns Full board activity feed.
 */
export async function getBoardActivityForUser(userId: number, boardId: number) {
  const board = await findBoardById(boardId)
  if (!board) {
    throw new HttpError(404, 'Board not found')
  }

  const member = await isBoardMember(userId, boardId)
  if (!member) {
    throw new HttpError(403, 'Not a board member')
  }

  const events = await findBoardActivity(boardId)
  return { events }
}

/**
 * @param boardId Board ID.
 * @returns Public activity preview.
 */
export async function getBoardActivityPreview(boardId: number) {
  const board = await findBoardById(boardId)
  if (!board) {
    throw new HttpError(404, 'Board not found')
  }

  const events = await findBoardActivity(boardId, 10)
  return { events }
}

/**
 * @param cardId Card ID.
 * @returns Card detail response.
 */
export async function getCardById(cardId: number) {
  const card = await findCardByIdWithDetails(cardId)
  if (!card) {
    throw new HttpError(404, 'Not found')
  }

  return {
    ...card,
    labels: card.labels.map((entry) => entry.label),
  }
}

/**
 * @param payload Card creation payload.
 * @returns Created card.
 */
export async function createCardForList(payload: {
  title: string
  description?: string
  listId: number
  assigneeId?: number
}) {
  const position = await countCardsInList(payload.listId)
  return createCard({ ...payload, position })
}

/**
 * @param userId Authenticated user ID.
 * @param payload Card move payload.
 */
export async function moveCardForUser(
  userId: number,
  payload: { cardId: number; targetListId: number; position: number },
) {
  const card = await findCardWithList(payload.cardId)
  if (!card) {
    throw new HttpError(404, 'Not found')
  }

  const member = await isBoardMember(userId, card.list.boardId)
  if (!member) {
    throw new HttpError(403, 'Not a board member')
  }

  await moveCardAndLogEvent({
    cardId: payload.cardId,
    targetListId: payload.targetListId,
    position: payload.position,
    actorUserId: userId,
    boardId: card.list.boardId,
    fromListId: card.listId,
  })
}

/**
 * @param userId Authenticated user ID.
 * @param payload Comment payload.
 * @returns Created comment.
 */
export async function addCommentForUser(
  userId: number,
  payload: { cardId: number; content: string },
) {
  const card = await findCardWithList(payload.cardId)
  if (!card) {
    throw new HttpError(404, 'Not found')
  }

  const member = await isBoardMember(userId, card.list.boardId)
  if (!member) {
    throw new HttpError(403, 'Not a board member')
  }

  return createCommentAndLogEvent({
    cardId: payload.cardId,
    boardId: card.list.boardId,
    userId,
    content: payload.content,
  })
}

/**
 * @param cardId Card ID.
 */
export function deleteCardById(cardId: number) {
  return deleteCard(cardId)
}

/**
 * @param input User registration payload.
 */
export async function registerUser(input: { email: string; password: string; name: string }) {
  const hashedPassword = await bcrypt.hash(input.password, 10)
  const user = await createUser({ ...input, password: hashedPassword })
  return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt }
}

/**
 * @param input Login payload.
 */
export async function loginUser(input: { email: string; password: string }) {
  const user = await findUserByEmail(input.email)
  if (!user) {
    throw new HttpError(401, 'Invalid credentials')
  }

  const validPassword = await bcrypt.compare(input.password, user.password)
  if (!validPassword) {
    throw new HttpError(401, 'Invalid credentials')
  }

  const token = jwt.sign({ userId: user.id }, getJwtSecret(), { expiresIn: '7d' })
  return { token }
}

/**
 * @param userId User ID.
 */
export async function getUserProfile(userId: number) {
  const user = await findUserById(userId)
  if (!user) {
    throw new HttpError(404, 'Not found')
  }

  return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt }
}
