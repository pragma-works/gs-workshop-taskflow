import * as cardRepo from '../repositories/card.repository'
import * as commentRepo from '../repositories/comment.repository'
import * as activityRepo from '../repositories/activity.repository'

export async function getCard(cardId: number) {
  const card = await cardRepo.findCardWithDetails(cardId)
  if (!card) {
    throw Object.assign(new Error('Not found'), { status: 404 })
  }
  return card
}

export async function createCard(data: {
  title: string
  description?: string
  listId: number
  assigneeId?: number
}) {
  const count = await cardRepo.countCardsByListId(data.listId)
  return cardRepo.createCard({ ...data, position: count })
}

export async function moveCard(
  cardId: number,
  targetListId: number,
  position: number,
  userId: number
) {
  const card = await cardRepo.findCardWithBoard(cardId)
  if (!card) {
    throw Object.assign(new Error('Not found'), { status: 404 })
  }

  const fromListId = card.listId
  const boardId = card.list.boardId
  const meta = JSON.stringify({ fromListId, toListId: targetListId })

  return cardRepo.moveCardWithActivity(cardId, targetListId, position, {
    boardId,
    userId,
    meta,
  })
}

export async function addComment(cardId: number, content: string, userId: number) {
  const card = await cardRepo.findCardWithBoard(cardId)
  if (!card) {
    throw Object.assign(new Error('Not found'), { status: 404 })
  }

  const comment = await commentRepo.createComment({ content, cardId, userId })

  await activityRepo.createActivityEvent({
    boardId: card.list.boardId,
    cardId,
    userId,
    action: 'comment_added',
  })

  return comment
}

export async function deleteCard(cardId: number) {
  return cardRepo.deleteCard(cardId)
}
