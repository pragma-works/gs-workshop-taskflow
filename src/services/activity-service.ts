import { ActivityRepository, activityRepository } from '../repositories/activity-repository'
import { assertBoardMember } from './board-service'

type ActivityRecord = Awaited<ReturnType<ActivityRepository['findBoardActivity']>>[number]

type ActivityServiceDependencies = {
  activityRepository: ActivityRepository
}

const defaultDependencies: ActivityServiceDependencies = {
  activityRepository,
}

function mapActivityEvent(event: ActivityRecord & {
  actor: { name: string }
  card: { title: string } | null
  fromList: { name: string } | null
  toList: { name: string } | null
}) {
  return {
    id: event.id,
    boardId: event.boardId,
    actorId: event.actorId,
    actorName: event.actor.name,
    eventType: event.eventType,
    cardTitle: event.card?.title ?? null,
    fromListName: event.fromList?.name ?? null,
    toListName: event.toList?.name ?? null,
    timestamp: event.createdAt,
  }
}

async function loadBoardActivity(
  boardId: number,
  dependencies: ActivityServiceDependencies = defaultDependencies
) {
  const events = await dependencies.activityRepository.findBoardActivity(boardId)

  return events.map(mapActivityEvent)
}

export async function getBoardActivityForUser(
  userId: number,
  boardId: number,
  dependencies: ActivityServiceDependencies = defaultDependencies
) {
  await assertBoardMember(userId, boardId)
  return loadBoardActivity(boardId, dependencies)
}

export async function getBoardActivityPreview(
  boardId: number,
  dependencies: ActivityServiceDependencies = defaultDependencies
) {
  return loadBoardActivity(boardId, dependencies)
}