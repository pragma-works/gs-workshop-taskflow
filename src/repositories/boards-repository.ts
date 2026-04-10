import type { PrismaClient } from '@prisma/client'

export interface BoardSummaryRecord {
  readonly id: number
  readonly name: string
  readonly createdAt: Date
}

export interface MembershipRecord {
  readonly userId: number
  readonly boardId: number
  readonly role: string
}

export interface BoardCardRecord {
  readonly id: number
  readonly title: string
  readonly description: string | null
  readonly position: number
  readonly dueDate: Date | null
  readonly listId: number
  readonly assigneeId: number | null
  readonly createdAt: Date
  readonly comments: ReadonlyArray<{
    readonly id: number
    readonly content: string
    readonly createdAt: Date
    readonly cardId: number
    readonly userId: number
  }>
  readonly labels: ReadonlyArray<{
    readonly id: number
    readonly name: string
    readonly color: string
  }>
}

export interface BoardListRecord {
  readonly id: number
  readonly name: string
  readonly position: number
  readonly boardId: number
  readonly cards: ReadonlyArray<BoardCardRecord>
}

export interface BoardDetailsRecord {
  readonly id: number
  readonly name: string
  readonly createdAt: Date
  readonly lists: ReadonlyArray<BoardListRecord>
}

export interface BoardsRepository {
  listForUser(userId: number): Promise<ReadonlyArray<BoardSummaryRecord>>
  findById(boardId: number): Promise<BoardSummaryRecord | null>
  findMembership(userId: number, boardId: number): Promise<MembershipRecord | null>
  findDetailedBoardById(boardId: number): Promise<BoardDetailsRecord | null>
  createBoard(name: string, ownerId: number): Promise<BoardSummaryRecord>
  addMember(boardId: number, memberId: number): Promise<void>
}

export function createBoardsRepository(databaseClient: PrismaClient): BoardsRepository {
  return {
    listForUser(userId: number): Promise<ReadonlyArray<BoardSummaryRecord>> {
      return databaseClient.board.findMany({
        where: {
          members: {
            some: { userId },
          },
        },
        orderBy: { id: 'asc' },
      })
    },

    findById(boardId: number): Promise<BoardSummaryRecord | null> {
      return databaseClient.board.findUnique({ where: { id: boardId } })
    },

    findMembership(userId: number, boardId: number): Promise<MembershipRecord | null> {
      return databaseClient.boardMember.findUnique({
        where: {
          userId_boardId: { userId, boardId },
        },
      })
    },

    async findDetailedBoardById(boardId: number): Promise<BoardDetailsRecord | null> {
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
            comments: card.comments,
            labels: card.labels.map(({ label }) => ({
              id: label.id,
              name: label.name,
              color: label.color,
            })),
          })),
        })),
      }
    },

    async createBoard(name: string, ownerId: number): Promise<BoardSummaryRecord> {
      return databaseClient.$transaction(async (transactionClient) => {
        const board = await transactionClient.board.create({
          data: { name },
        })

        await transactionClient.boardMember.create({
          data: {
            userId: ownerId,
            boardId: board.id,
            role: 'owner',
          },
        })

        return board
      })
    },

    async addMember(boardId: number, memberId: number): Promise<void> {
      await databaseClient.boardMember.upsert({
        where: {
          userId_boardId: {
            userId: memberId,
            boardId,
          },
        },
        update: {},
        create: {
          userId: memberId,
          boardId,
          role: 'member',
        },
      })
    },
  }
}
