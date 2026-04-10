import prisma from './db'
import { AppError } from './errors'

export async function getBoardAccess(userId: number, boardId: number) {
  return prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
    select: { role: true },
  })
}

export async function requireBoardMember(userId: number, boardId: number): Promise<void> {
  const board = await prisma.board.findUnique({ where: { id: boardId }, select: { id: true } })
  if (!board) {
    throw new AppError(404, 'Board not found')
  }

  const membership = await getBoardAccess(userId, boardId)
  if (!membership) {
    throw new AppError(403, 'Forbidden')
  }
}

export async function requireBoardOwner(userId: number, boardId: number): Promise<void> {
  const membership = await getBoardAccess(userId, boardId)
  if (!membership) {
    const board = await prisma.board.findUnique({ where: { id: boardId }, select: { id: true } })
    if (!board) {
      throw new AppError(404, 'Board not found')
    }
    throw new AppError(403, 'Forbidden')
  }

  if (membership.role !== 'owner') {
    throw new AppError(403, 'Owner access required')
  }
}

export async function getListContext(listId: number) {
  const list = await prisma.list.findUnique({
    where: { id: listId },
    select: { id: true, name: true, boardId: true, position: true },
  })
  if (!list) {
    throw new AppError(404, 'List not found')
  }
  return list
}

export async function getCardContext(cardId: number) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: {
      id: true,
      title: true,
      description: true,
      position: true,
      listId: true,
      assigneeId: true,
      list: {
        select: {
          id: true,
          name: true,
          boardId: true,
        },
      },
    },
  })
  if (!card) {
    throw new AppError(404, 'Card not found')
  }
  return card
}

export async function requireBoardOwnerOrAssignee(
  userId: number,
  card: Awaited<ReturnType<typeof getCardContext>>,
): Promise<void> {
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId: card.list.boardId } },
    select: { role: true },
  })

  if (!membership) {
    throw new AppError(403, 'Forbidden')
  }

  const isBoardOwner = membership.role === 'owner'
  const isAssignee = card.assigneeId === userId
  if (!isBoardOwner && !isAssignee) {
    throw new AppError(403, 'Forbidden')
  }
}