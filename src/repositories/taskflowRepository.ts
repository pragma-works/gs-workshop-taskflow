import { Prisma } from '@prisma/client'
import db from '../db'

export interface ActivityEventCreateInput {
  boardId: number
  cardId?: number
  userId: number
  action: string
  meta?: string
}

/**
 * @param userId Authenticated user ID.
 * @returns Boards where the user is a member.
 */
export async function findBoardsByMember(userId: number) {
  const memberships = await db.boardMember.findMany({
    where: { userId },
    include: { board: true },
  })

  return memberships.map((membership) => membership.board)
}

/**
 * @param boardId Board ID.
 * @returns Board or null.
 */
export function findBoardById(boardId: number) {
  return db.board.findUnique({ where: { id: boardId } })
}

/**
 * @param userId User ID.
 * @param boardId Board ID.
 * @returns True when the user belongs to the board.
 */
export async function isBoardMember(userId: number, boardId: number): Promise<boolean> {
  const membership = await db.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })

  return membership !== null
}

/**
 * @param boardId Board ID.
 * @returns Board lists/cards/comments/labels in one query.
 */
export function findBoardWithDetails(boardId: number) {
  return db.board.findUnique({
    where: { id: boardId },
    include: {
      lists: {
        orderBy: { position: 'asc' },
        include: {
          cards: {
            orderBy: { position: 'asc' },
            include: {
              comments: true,
              labels: { include: { label: true } },
            },
          },
        },
      },
    },
  })
}

/**
 * @param name Board name.
 * @param ownerId User ID that becomes owner.
 * @returns Created board.
 */
export async function createBoardWithOwner(name: string, ownerId: number) {
  const board = await db.board.create({ data: { name } })
  await db.boardMember.create({ data: { userId: ownerId, boardId: board.id, role: 'owner' } })
  return board
}

/**
 * @param boardId Board ID.
 * @param memberId Member user ID.
 */
export function addBoardMember(boardId: number, memberId: number) {
  return db.boardMember.create({ data: { userId: memberId, boardId, role: 'member' } })
}

/**
 * @param boardId Board ID.
 * @param limit Max records.
 * @returns Board activity events sorted newest first.
 */
export function findBoardActivity(boardId: number, limit?: number) {
  return db.activityEvent.findMany({
    where: { boardId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/**
 * @param input New activity event payload.
 */
export function createActivityEvent(input: ActivityEventCreateInput) {
  return db.activityEvent.create({ data: input })
}

/**
 * @param cardId Card ID.
 * @returns Card including list and board ownership metadata.
 */
export function findCardWithList(cardId: number) {
  return db.card.findUnique({
    where: { id: cardId },
    include: { list: true },
  })
}

/**
 * @param cardId Card ID.
 * @returns Card with comments and labels.
 */
export function findCardByIdWithDetails(cardId: number) {
  return db.card.findUnique({
    where: { id: cardId },
    include: {
      comments: true,
      labels: { include: { label: true } },
    },
  })
}

/**
 * @param listId List ID.
 * @returns Number of cards in list.
 */
export function countCardsInList(listId: number) {
  return db.card.count({ where: { listId } })
}

/**
 * @param data Card creation payload.
 * @returns Created card.
 */
export function createCard(data: { title: string; description?: string; listId: number; assigneeId?: number; position: number }) {
  return db.card.create({ data })
}

/**
 * @param cardId Card ID.
 */
export function deleteCard(cardId: number) {
  return db.card.delete({ where: { id: cardId } })
}

/**
 * @param params Card move payload.
 */
export function moveCardAndLogEvent(params: {
  cardId: number
  targetListId: number
  position: number
  actorUserId: number
  boardId: number
  fromListId: number
}) {
  return db.$transaction(async (transactionClient: Prisma.TransactionClient) => {
    await transactionClient.card.update({
      where: { id: params.cardId },
      data: { listId: params.targetListId, position: params.position },
    })

    await transactionClient.activityEvent.create({
      data: {
        boardId: params.boardId,
        cardId: params.cardId,
        userId: params.actorUserId,
        action: 'card_moved',
        meta: JSON.stringify({ fromListId: params.fromListId, toListId: params.targetListId, position: params.position }),
      },
    })
  })
}

/**
 * @param params Comment payload.
 * @returns Created comment.
 */
export function createCommentAndLogEvent(params: {
  cardId: number
  boardId: number
  userId: number
  content: string
}) {
  return db.$transaction(async (transactionClient: Prisma.TransactionClient) => {
    const comment = await transactionClient.comment.create({
      data: { cardId: params.cardId, userId: params.userId, content: params.content },
    })

    await transactionClient.activityEvent.create({
      data: {
        boardId: params.boardId,
        cardId: params.cardId,
        userId: params.userId,
        action: 'comment_added',
        meta: JSON.stringify({ commentId: comment.id }),
      },
    })

    return comment
  })
}

/**
 * @param email User email.
 */
export function findUserByEmail(email: string) {
  return db.user.findUnique({ where: { email } })
}

/**
 * @param data User creation payload.
 */
export function createUser(data: { email: string; password: string; name: string }) {
  return db.user.create({ data })
}

/**
 * @param userId User ID.
 */
export function findUserById(userId: number) {
  return db.user.findUnique({ where: { id: userId } })
}
