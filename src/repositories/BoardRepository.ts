import { PrismaClient, Board } from '@prisma/client'
import { IBoardRepository, BoardDetail } from './IBoardRepository'

export class BoardRepository implements IBoardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAllForUser(userId: number): Promise<Board[]> {
    const memberships = await this.prisma.boardMember.findMany({
      where: { userId },
      include: { board: true },
    })
    return memberships.map((m) => m.board)
  }

  async findById(id: number): Promise<BoardDetail | null> {
    const board = await this.prisma.board.findUnique({
      where: { id },
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

    if (!board) return null

    return {
      ...board,
      lists: board.lists.map((list) => ({
        ...list,
        cards: list.cards.map((card) => ({
          ...card,
          labels: card.labels.map((cl) => cl.label),
        })),
      })),
    }
  }

  async create(name: string, ownerUserId: number): Promise<Board> {
    return this.prisma.$transaction(async (tx) => {
      const board = await tx.board.create({ data: { name } })
      await tx.boardMember.create({
        data: { userId: ownerUserId, boardId: board.id, role: 'owner' },
      })
      return board
    })
  }

  async addMember(userId: number, boardId: number, role: string): Promise<void> {
    await this.prisma.boardMember.create({ data: { userId, boardId, role } })
  }

  getMembership(userId: number, boardId: number) {
    return this.prisma.boardMember.findUnique({
      where: { userId_boardId: { userId, boardId } },
    })
  }
}
