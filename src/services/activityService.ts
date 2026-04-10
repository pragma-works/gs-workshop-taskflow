import { activityRepository } from '../repositories/activityRepository'
import { boardRepository } from '../repositories/boardRepository'

function formatActivityEvent(event: any) {
  return {
    id: event.id,
    boardId: event.boardId,
    actorId: event.actorId,
    actorName: event.actor?.name ?? null,
    eventType: event.eventType,
    cardId: event.cardId,
    cardTitle: event.card?.title ?? null,
    fromListName: event.fromList?.name ?? null,
    toListName: event.toList?.name ?? null,
    timestamp: event.createdAt,
  }
}

export const activityService = {
  async getBoardActivity(boardId: number) {
    const events = await activityRepository.getBoardEvents(boardId)
    return events.map(formatActivityEvent)
  },

  async getBoardActivityForMember(userId: number, boardId: number) {
    const isMember = await boardRepository.isMember(userId, boardId)
    if (!isMember) {
      return { forbidden: true as const, events: [] }
    }

    const events = await activityRepository.getBoardEvents(boardId)
    return { forbidden: false as const, events: events.map(formatActivityEvent) }
  },
}
