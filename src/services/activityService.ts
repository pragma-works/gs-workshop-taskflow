import { ActivityRepository } from '../repositories/activityRepository'
import { BoardService } from './boardService'

const activityRepository = new ActivityRepository()
const boardService = new BoardService()

export class ActivityService {
  async getBoardActivity(boardId: number, userId?: number) {
    if (userId !== undefined) {
      await boardService.ensureMember(userId, boardId)
    }

    const events = await activityRepository.findByBoard(boardId)
    return events.map((event) => ({
      id: event.id,
      boardId: event.boardId,
      actorId: event.actorId,
      eventType: event.eventType,
      cardId: event.cardId,
      fromListId: event.fromListId,
      toListId: event.toListId,
      createdAt: event.createdAt,
      actorName: event.actor.name,
      cardTitle: event.card?.title ?? null,
      fromListName: event.fromList?.name ?? null,
      toListName: event.toList?.name ?? null,
    }))
  }
}
