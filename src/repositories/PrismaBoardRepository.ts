import prisma from '../db'
import type { IBoardRepository, BoardRow, BoardWithDetailsRow } from './types'

export class PrismaBoardRepository implements IBoardRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly client: any = prisma) {}

  async findById(id: number): Promise<BoardRow | null> {
    return this.client.board.findUnique({ where: { id } }) as Promise<BoardRow | null>
  }

  /**
   * Returns the full board with lists → cards → comments + labels in one query.
   * Replaces the N+1 loop in the original boards route.
   */
  async findByIdWithDetails(id: number): Promise<BoardWithDetailsRow | null> {
    const board = await this.client.board.findUnique({
      where:   { id },
      include: {
        lists: {
          orderBy: { position: 'asc' },
          include: {
            cards: {
              orderBy: { position: 'asc' },
              include: {
                comments:   true,
                cardLabels: { include: { label: true } },
              },
            },
          },
        },
      },
    })

    if (!board) return null

    return {
      id:        board.id,
      name:      board.name,
      createdAt: board.createdAt,
      lists: board.lists.map((list: any) => ({
        id:       list.id,
        name:     list.name,
        boardId:  list.boardId,
        position: list.position,
        cards: list.cards.map((card: any) => ({
          id:          card.id,
          title:        card.title,
          listId:       card.listId,
          position:     card.position,
          description:  card.description,
          assigneeId:   card.assigneeId,
          createdAt:    card.createdAt,
          comments:     card.comments,
          labels:       card.cardLabels.map((cl: any) => cl.label),
        })),
      })),
    }
  }

  async findByUserId(userId: number): Promise<BoardRow[]> {
    const memberships = await this.client.boardMember.findMany({
      where:   { userId },
      include: { board: true },
    })
    return memberships.map((m: any) => m.board) as BoardRow[]
  }

  async create(name: string): Promise<BoardRow> {
    return this.client.board.create({ data: { name } }) as Promise<BoardRow>
  }
}
