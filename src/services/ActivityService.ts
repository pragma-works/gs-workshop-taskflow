import activityRepo from '../repositories/ActivityRepository'
import boardRepo from '../repositories/BoardRepository'

export class ActivityService {
  async getActivityFeed(boardId: number, userId: number) {
    const isMember = await boardRepo.checkMembership(userId, boardId)
    if (!isMember) {
      throw new Error('Not a board member')
    }

    const events = await activityRepo.findByBoardId(boardId)
    return events.map(event => ({
      ...event,
      actorName: event.actor.name,
      cardTitle: event.card?.title ?? null,
      fromListName: event.fromList?.name ?? null,
      toListName: event.toList?.name ?? null
    }))
  }

  async getActivityPreview(boardId: number) {
    const events = await activityRepo.findByBoardId(boardId)
    return events.map(event => ({
      ...event,
      actorName: event.actor.name,
      cardTitle: event.card?.title ?? null,
      fromListName: event.fromList?.name ?? null,
      toListName: event.toList?.name ?? null
    }))
  }
}

export default new ActivityService()
