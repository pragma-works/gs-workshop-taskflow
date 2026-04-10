import prisma from '../db'

import { mapCardWithResolvedLabels } from './cardMappers'

export async function findBoardMembership(userId: number, boardId: number) {
  return prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
}

export async function isBoardMember(userId: number, boardId: number): Promise<boolean> {
  return (await findBoardMembership(userId, boardId)) !== null
}

export async function isBoardOwner(userId: number, boardId: number): Promise<boolean> {
  const membership = await findBoardMembership(userId, boardId)
  return membership?.role === 'owner'
}

export async function listBoardsForUser(userId: number) {
  return prisma.board.findMany({
    where: { members: { some: { userId } } },
    orderBy: { createdAt: 'asc' },
  })
}

export async function findBoardWithDetails(boardId: number) {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      lists: {
        orderBy: { position: 'asc' },
        include: {
          cards: {
            orderBy: { position: 'asc' },
            include: {
              comments: true,
              labels: {
                include: {
                  label: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!board) {
    return null
  }

  return {
    ...board,
    lists: board.lists.map((list) => ({
      ...list,
      cards: list.cards.map((card) => mapCardWithResolvedLabels(card)),
    })),
  }
}

export async function createBoardWithOwner(name: string, userId: number) {
  return prisma.$transaction(async (tx) => {
    const board = await tx.board.create({ data: { name } })
    await tx.boardMember.create({
      data: { userId, boardId: board.id, role: 'owner' },
    })
    return board
  })
}

export async function addBoardMember(boardId: number, memberId: number) {
  return prisma.boardMember.create({
    data: { userId: memberId, boardId, role: 'member' },
  })
}
