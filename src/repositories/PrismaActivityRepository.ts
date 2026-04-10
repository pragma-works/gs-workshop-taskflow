import prisma from '../db'
import type { IActivityRepository, ActivityEventDto } from './types'

export class PrismaActivityRepository implements IActivityRepository {
  async listForBoard(boardId: number): Promise<ActivityEventDto[]> {
    const rows = await prisma.activityEvent.findMany({
      where:   { boardId },
      orderBy: { createdAt: 'desc' },
      take:    50,
      select: {
        id:           true,
        boardId:      true,
        eventType:    true,
        cardTitle:    true,
        fromListName: true,
        toListName:   true,
        createdAt:    true,
        actor: { select: { id: true, name: true } },
        card:  { select: { id: true } },
      },
    })

    return rows.map(r => ({
      id:           r.id,
      boardId:      r.boardId,
      actorId:      r.actor.id,
      actorName:    r.actor.name,
      eventType:    r.eventType,
      cardId:       r.card.id,
      cardTitle:    r.cardTitle,
      fromListName: r.fromListName,
      toListName:   r.toListName,
      timestamp:    r.createdAt,
    }))
  }
}
