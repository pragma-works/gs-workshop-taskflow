import prisma from '../db'
import type {
  IActivityRepository,
  ActivityEventDto,
  CreateActivityEventInput,
  PaginationOptions,
} from './types'

export class PrismaActivityRepository implements IActivityRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly client: any = prisma) {}

  async listForBoard(boardId: number, options: PaginationOptions): Promise<ActivityEventDto[]> {
    const rows = await this.client.activityEvent.findMany({
      where:   { boardId },
      orderBy: { createdAt: 'desc' },
      skip:    options.offset,
      take:    options.limit,
      include: { actor: { select: { id: true, name: true } } },
    })

    return rows.map((r: any) => ({
      id:           r.id,
      boardId:      r.boardId,
      actorId:      r.actor.id,
      actorName:    r.actor.name,
      eventType:    r.eventType,
      cardId:       r.cardId,
      cardTitle:    r.cardTitle,
      fromListName: r.fromListName ?? null,
      toListName:   r.toListName ?? null,
      timestamp:    r.createdAt,
    }))
  }

  async create(data: CreateActivityEventInput): Promise<void> {
    await this.client.activityEvent.create({ data })
  }
}
