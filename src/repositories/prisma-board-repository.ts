import type { Prisma, PrismaClient } from '@prisma/client'
import type { BoardDetailsRecord, BoardRecord, BoardRole } from '../domain/models'
import type { BoardAccessRepository } from '../services/board-access-service'
import type {
  BoardMembershipRepository,
  BoardReadRepository,
} from '../services/boards-service'

type BoardRecordWithDetails = Prisma.BoardGetPayload<{
  include: {
    lists: {
      include: {
        cards: {
          include: {
            comments: true
            labels: {
              include: {
                label: true
              }
            }
          }
        }
      }
    }
  }
}>

/** Prisma implementation of board persistence operations. */
export class PrismaBoardRepository
  implements BoardReadRepository, BoardMembershipRepository, BoardAccessRepository
{
  /** @param prismaClient Prisma client instance for database access. */
  public constructor(private readonly prismaClient: PrismaClient) {}

  /** Creates a board together with its owner membership. */
  public async createBoard(name: string, ownerId: number): Promise<BoardRecord> {
    return this.prismaClient.board.create({
      data: {
        members: {
          create: {
            role: 'owner',
            userId: ownerId,
          },
        },
        name,
      },
    })
  }

  /** Finds a board by id. */
  public async findBoardById(boardId: number): Promise<BoardRecord | null> {
    return this.prismaClient.board.findUnique({ where: { id: boardId } })
  }

  /** Lists every board a user belongs to. */
  public async findBoardsForUser(userId: number): Promise<readonly BoardRecord[]> {
    return this.prismaClient.board.findMany({
      orderBy: { createdAt: 'desc' },
      where: {
        members: {
          some: { userId },
        },
      },
    })
  }

  /** Finds a member role for a user-board pair. */
  public async findMemberRole(userId: number, boardId: number): Promise<BoardRole | null> {
    const membership = await this.prismaClient.boardMember.findUnique({
      where: { userId_boardId: { boardId, userId } },
    })

    if (membership === null) {
      return null
    }

    return parseBoardRole(membership.role)
  }

  /** Adds a new board member with the requested role. */
  public async addMember(boardId: number, memberId: number, role: BoardRole): Promise<void> {
    await this.prismaClient.boardMember.create({
      data: {
        boardId,
        role,
        userId: memberId,
      },
    })
  }

  /** Returns a board with lists, cards, comments, and labels without N+1 queries. */
  public async findBoardDetails(boardId: number): Promise<BoardDetailsRecord | null> {
    const board = await this.prismaClient.board.findUnique({
      include: {
        lists: {
          include: {
            cards: {
              include: {
                comments: {
                  orderBy: { createdAt: 'asc' },
                },
                labels: {
                  include: { label: true },
                  orderBy: { labelId: 'asc' },
                },
              },
              orderBy: { position: 'asc' },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
      where: { id: boardId },
    })

    return board === null ? null : mapBoardDetails(board)
  }
}

function parseBoardRole(role: string): BoardRole {
  if (role === 'member' || role === 'owner') {
    return role
  }

  throw new Error(`Unsupported board role: ${role}`)
}

function mapBoardDetails(board: BoardRecordWithDetails): BoardDetailsRecord {
  return {
    createdAt: board.createdAt,
    id: board.id,
    lists: board.lists.map((list) => ({
      boardId: list.boardId,
      cards: list.cards.map((card) => ({
        assigneeId: card.assigneeId,
        comments: card.comments,
        createdAt: card.createdAt,
        description: card.description,
        dueDate: card.dueDate,
        id: card.id,
        labels: card.labels.map((labelRecord) => labelRecord.label),
        listId: card.listId,
        position: card.position,
        title: card.title,
      })),
      id: list.id,
      name: list.name,
      position: list.position,
    })),
    name: board.name,
  }
}
