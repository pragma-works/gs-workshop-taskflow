import { PrismaClient, Card, Comment } from '@prisma/client'
import { ICardRepository, CardWithList, MoveResult } from './ICardRepository'

export class CardRepository implements ICardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: number): Promise<CardWithList | null> {
    return this.prisma.card.findUnique({
      where: { id },
      include: { list: true },
    })
  }

  async create(data: {
    title: string
    description?: string
    listId: number
    assigneeId?: number
  }): Promise<Card> {
    const position = await this.prisma.card.count({ where: { listId: data.listId } })
    return this.prisma.card.create({
      data: {
        title: data.title,
        description: data.description,
        listId: data.listId,
        assigneeId: data.assigneeId,
        position,
      },
    })
  }

  async moveWithActivity(
    cardId: number,
    targetListId: number,
    position: number,
    actorId: number,
    boardId: number,
    fromListId: number,
  ): Promise<MoveResult> {
    const [, event] = await this.prisma.$transaction([
      this.prisma.card.update({
        where: { id: cardId },
        data: { listId: targetListId, position },
      }),
      this.prisma.activityEvent.create({
        data: {
          eventType: 'card_moved',
          boardId,
          actorId,
          cardId,
          fromListId,
          toListId: targetListId,
        },
      }),
    ])
    return event
  }

  addComment(cardId: number, userId: number, content: string): Promise<Comment> {
    return this.prisma.comment.create({ data: { content, cardId, userId } })
  }

  async delete(id: number): Promise<void> {
    await this.prisma.card.delete({ where: { id } })
  }
}
