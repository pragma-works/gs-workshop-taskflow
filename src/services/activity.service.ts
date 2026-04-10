import * as activityRepo from '../repositories/activity.repository'
import * as boardRepo from '../repositories/board.repository'
import { assertBoardMember } from './board.service'

export async function getActivityFeed(boardId: number, userId: number) {
  await assertBoardMember(boardId, userId)
  const events = await activityRepo.findEventsByBoardId(boardId)
  return { events }
}

export async function getActivityPreview(boardId: number) {
  const board = await boardRepo.findBoardById(boardId)
  if (!board) {
    throw Object.assign(new Error('Board not found'), { status: 404 })
  }

  const events = await activityRepo.findEventsByBoardId(boardId, 10)
  return { events }
}
