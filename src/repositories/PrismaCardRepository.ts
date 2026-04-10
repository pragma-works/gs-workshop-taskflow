import prisma from '../db'
import type {
  ICardRepository,
  CardRow,
  CreatedCardRow,
  CreateCardInput,
  CreateActivityEventForNewCard,
  MoveCardInput,
} from './types'

export class PrismaCardRepository implements ICardRepository {
  async findById(id: number): Promise<CardRow | null> {
    return prisma.card.findUnique({
      where: { id },
      select: {
        id:       true,
        title:    true,
        listId:   true,
        position: true,
        list: { select: { id: true, name: true, boardId: true } },
      },
    })
  }

  async countInList(listId: number): Promise<number> {
    return prisma.card.count({ where: { listId } })
  }

  async createWithEvent(
    cardData:  CreateCardInput,
    eventData: CreateActivityEventForNewCard,
  ): Promise<CreatedCardRow> {
    return prisma.$transaction(async (tx) => {
      const card = await tx.card.create({ data: cardData })
      await tx.activityEvent.create({
        data: {
          boardId:      eventData.boardId,
          cardId:       card.id,        // filled in after card is created
          userId:       eventData.userId,
          eventType:    eventData.eventType,
          cardTitle:    eventData.cardTitle,
          fromListName: eventData.fromListName ?? null,
          toListName:   eventData.toListName   ?? null,
        },
      })
      return card
    })
  }

  async moveWithEvent(input: MoveCardInput): Promise<void> {
    const ev = input.activityEvent
    await prisma.$transaction([
      prisma.card.update({
        where: { id: input.cardId },
        data:  { listId: input.targetListId, position: input.position },
      }),
      prisma.activityEvent.create({
        data: {
          boardId:      ev.boardId,
          cardId:       ev.cardId,
          userId:       ev.userId,
          eventType:    ev.eventType,
          cardTitle:    ev.cardTitle,
          fromListName: ev.fromListName ?? null,
          toListName:   ev.toListName   ?? null,
        },
      }),
    ])
  }
}
