import prisma from '../db'
import type { Board, BoardMember } from '@prisma/client'

export async function getBoardsForUser(userId: number): Promise<Board[]> {
  const memberships = await prisma.boardMember.findMany({
    where: { userId },
    include: { board: true },
  })
  return memberships.map((m) => m.board)
}

export async function getBoardById(boardId: number) {
  return prisma.board.findUnique({
    where: { id: boardId },
    include: {
      members: true,
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

export async function createBoard(name: string, userId: number): Promise<Board> {
  return prisma.$transaction(async (tx) => {
    const board = await tx.board.create({ data: { name } })
    await tx.boardMember.create({ data: { userId, boardId: board.id, role: 'owner' } })
    return board
  })
}

export async function getMembership(
  userId: number,
  boardId: number,
): Promise<BoardMember | null> {
  return prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
}

export async function addMember(
  boardId: number,
  memberId: number,
  callerRole: string,
): Promise<BoardMember> {
  if (callerRole !== 'owner') throw new Error('Forbidden')
  return prisma.boardMember.create({ data: { userId: memberId, boardId, role: 'member' } })
}
