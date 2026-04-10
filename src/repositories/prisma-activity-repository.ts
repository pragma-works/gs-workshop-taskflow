import type { ActivityEvent as PrismaActivityEvent, PrismaClient } from '@prisma/client'
import {
  parseActivityAction,
  parseActivityMeta,
  type ActivityEvent,
} from '../domain/activity-events'
import type {
  ActivityPreviewRepository,
  BoardActivityRepository,
} from '../services/activity-service'

/** Prisma implementation of activity feed queries. */
export class PrismaActivityRepository implements BoardActivityRepository, ActivityPreviewRepository {
  /** @param prismaClient Prisma client instance for database access. */
  public constructor(private readonly prismaClient: PrismaClient) {}

  /** Lists board activity events newest first. */
  public async findEventsForBoard(boardId: number): Promise<readonly ActivityEvent[]> {
    const events = await this.prismaClient.activityEvent.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      where: { boardId },
    })

    return events.map(mapActivityEvent)
  }

  /** Lists the latest board activity events for public previews. */
  public async findLatestEventsForBoard(
    boardId: number,
    limit: number,
  ): Promise<readonly ActivityEvent[]> {
    const events = await this.prismaClient.activityEvent.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      where: { boardId },
    })

    return events.map(mapActivityEvent)
  }
}

function mapActivityEvent(event: PrismaActivityEvent): ActivityEvent {
  return {
    action: parseActivityAction(event.action),
    boardId: event.boardId,
    cardId: event.cardId ?? undefined,
    createdAt: event.createdAt,
    id: event.id,
    meta: parseActivityMeta(event.meta),
    userId: event.userId,
  }
}
