import prisma from '../db'
import { Board, BoardMember } from '@prisma/client'

/**
 * Finds all boards a user is a member of.
 * @param userId - The user's ID
 * @returns {Promise<Board[]>} Array of boards
 */
export async function getBoardsForUser(userId: number): Promise<Board[]> {
  return prisma.board.findMany({
    where: { members: { some: { userId } } },
  })
}

/**
 * Finds a single board by ID including lists, cards, comments, and labels.
 * @param boardId - The board's ID
 * @returns {Promise<object | null>} Full board with nested data or null
 */
export async function getBoardWithDetails(boardId: number) {
  return prisma.board.findUnique({
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
 * Creates a new board and adds the creator as owner.
 * @param name - Board name
 * @param ownerId - User ID of the creator
 * @returns {Promise<Board>} The created board
 */
export async function createBoard(name: string, ownerId: number): Promise<Board> {
  return prisma.$transaction(async (tx) => {
    const board = await tx.board.create({ data: { name } })
    await tx.boardMember.create({ data: { userId: ownerId, boardId: board.id, role: 'owner' } })
    return board
  })
}

/**
 * Checks if a user is a member of a board.
 * @param userId - The user's ID
 * @param boardId - The board's ID
 * @returns {Promise<boolean>} True if member
 */
export async function isBoardMember(userId: number, boardId: number): Promise<boolean> {
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
  return membership !== null
}

/**
 * Adds a member to a board.
 * @param memberId - User ID to add
 * @param boardId - The board's ID
 * @returns {Promise<BoardMember>} The created membership
 */
export async function addBoardMember(memberId: number, boardId: number): Promise<BoardMember> {
  return prisma.boardMember.create({ data: { userId: memberId, boardId, role: 'member' } })
}
