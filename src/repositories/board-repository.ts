import { type PrismaClient } from '@prisma/client'
import {
  type BoardDetail,
  type BoardRepository,
  type BoardSummary,
} from '../services/board-service'

function toBoardSummary(board: { id: number; name: string; createdAt: Date }): BoardSummary {
  return {
    id: board.id,
    name: board.name,
    createdAt: board.createdAt,
  }
}

/**
 * Creates a Prisma-backed implementation of the board repository port.
 *
 * @param {PrismaClient} databaseClient - Database client used for persistence.
 * @returns {BoardRepository} Board repository implementation.
 */
export function createBoardRepository(databaseClient: PrismaClient): BoardRepository {
  return {
    async listBoardsForUser(userId: number): Promise<BoardSummary[]> {
      const boards = await databaseClient.board.findMany({
        where: { members: { some: { userId } } },
      })

      return boards.map(toBoardSummary)
    },

    async findBoardById(boardId: number): Promise<BoardSummary | null> {
      const board = await databaseClient.board.findUnique({
        where: { id: boardId },
        select: { id: true, name: true, createdAt: true },
      })

      return board ? toBoardSummary(board) : null
    },

    async findBoardDetail(boardId: number): Promise<BoardDetail | null> {
      const board = await databaseClient.board.findUnique({
        where: { id: boardId },
        include: {
          lists: {
            orderBy: { position: 'asc' },
            include: {
              cards: {
                orderBy: { position: 'asc' },
                include: {
                  comments: {
                    orderBy: { createdAt: 'asc' },
                  },
                  labels: {
                    include: { label: true },
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
        id: board.id,
        name: board.name,
        createdAt: board.createdAt,
        lists: board.lists.map((list) => ({
          id: list.id,
          name: list.name,
          position: list.position,
          boardId: list.boardId,
          cards: list.cards.map((card) => ({
            id: card.id,
            title: card.title,
            description: card.description,
            position: card.position,
            dueDate: card.dueDate,
            listId: card.listId,
            assigneeId: card.assigneeId,
            createdAt: card.createdAt,
            comments: card.comments.map((comment) => ({
              id: comment.id,
              content: comment.content,
              createdAt: comment.createdAt,
              cardId: comment.cardId,
              userId: comment.userId,
            })),
            labels: card.labels.map((cardLabel) => ({
              id: cardLabel.label.id,
              name: cardLabel.label.name,
              color: cardLabel.label.color,
            })),
          })),
        })),
      }
    },

    async findMemberRole(userId: number, boardId: number): Promise<string | null> {
      const membership = await databaseClient.boardMember.findUnique({
        where: { userId_boardId: { userId, boardId } },
      })

      return membership?.role ?? null
    },

    async createBoardWithOwner(name: string, ownerId: number): Promise<BoardSummary> {
      const board = await databaseClient.$transaction(async (transaction) => {
        const createdBoard = await transaction.board.create({ data: { name } })
        await transaction.boardMember.create({
          data: { userId: ownerId, boardId: createdBoard.id, role: 'owner' },
        })

        return createdBoard
      })

      return toBoardSummary(board)
    },

    async addMember(boardId: number, memberId: number): Promise<void> {
      await databaseClient.boardMember.create({
        data: { userId: memberId, boardId, role: 'member' },
      })
    },
  }
}
