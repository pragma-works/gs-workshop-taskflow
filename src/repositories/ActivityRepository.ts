import { PrismaClient } from '@prisma/client'
import { IActivityRepository, ActivityFeedEvent } from './IActivityRepository'

export class ActivityRepository implements IActivityRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByBoard(boardId: number): Promise<ActivityFeedEvent[]> {
    const events = await this.prisma.activityEvent.findMany({
      where: { boardId },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { name: true } },
        card: { select: { title: true } },
        fromList: { select: { name: true } },
        toList: { select: { name: true } },
      },
    })

    return events.map((e) => ({
      id: e.id,
      boardId: e.boardId,
      actorId: e.actorId,
      eventType: e.eventType,
      cardId: e.cardId,
      fromListId: e.fromListId,
      toListId: e.toListId,
      createdAt: e.createdAt,
      actorName: e.actor.name,
      cardTitle: e.card?.title ?? null,
      fromListName: e.fromList?.name ?? null,
      toListName: e.toList?.name ?? null,
    }))
  }
}
