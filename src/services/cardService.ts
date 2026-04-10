import { HttpError } from '../errors'
import { ActivityRepository } from '../repositories/activityRepository'
import { BoardRepository } from '../repositories/boardRepository'
import { CardRepository } from '../repositories/cardRepository'

const cardRepository = new CardRepository()
const boardRepository = new BoardRepository()
const activityRepository = new ActivityRepository()

export class CardService {
  async getCardById(_userId: number, cardId: number) {
    const card = await cardRepository.findByIdDetailed(cardId)
    if (!card) {
      throw new HttpError(404, 'Not found')
    }

    return {
      ...card,
      labels: card.labels.map((cardLabel) => cardLabel.label),
    }
  }

  async createCard(
    userId: number,
    data: { title: string; description?: string; listId: number; assigneeId?: number | null },
  ) {
    if (!data.title || data.title.trim().length === 0) {
      throw new HttpError(400, 'Title is required')
    }

    const cardCount = await cardRepository.countInList(data.listId)
    const boardInfo = await cardRepository.findListBoardInfo(data.listId)

    if (!boardInfo) {
      throw new HttpError(404, 'List not found')
    }

    const isMember = await boardRepository.isMember(userId, boardInfo.boardId)
    if (!isMember) {
      throw new HttpError(403, 'Not a board member')
    }

    return cardRepository.create({
      title: data.title.trim(),
      description: data.description,
      listId: data.listId,
      assigneeId: data.assigneeId,
      position: cardCount,
    })
  }

  async moveCardWithActivity(userId: number, cardId: number, targetListId: number, position: number) {
    if (!Number.isInteger(targetListId) || !Number.isInteger(position)) {
      throw new HttpError(400, 'targetListId and position must be integers')
    }

    const card = await cardRepository.findByIdWithBoard(cardId)
    if (!card) {
      throw new HttpError(404, 'Not found')
    }

    const boardId = card.list.boardId
    const isMember = await boardRepository.isMember(userId, boardId)
    if (!isMember) {
      throw new HttpError(403, 'Not a board member')
    }

    try {
      const event = await cardRepository.runInTransaction(async (tx) => {
        const targetList = await cardRepository.findListById(targetListId, tx)
        if (!targetList || targetList.boardId !== boardId) {
          throw new HttpError(404, 'Target list not found')
        }

        await cardRepository.move(cardId, targetListId, position, tx)

        return activityRepository.createMoveEvent(
          {
            boardId,
            actorId: userId,
            cardId,
            fromListId: card.listId,
            toListId: targetListId,
          },
          tx,
        )
      })

      return { ok: true, event }
    } catch (error) {
      if (error instanceof HttpError) {
        throw error
      }

      const details = error instanceof Error ? error.message : 'Unknown error'
      throw new HttpError(500, 'Move failed', details)
    }
  }

  async addComment(userId: number, cardId: number, content: string) {
    if (!content || content.trim().length === 0) {
      throw new HttpError(400, 'Content is required')
    }

    const card = await cardRepository.findByIdWithBoard(cardId)
    if (!card) {
      throw new HttpError(404, 'Not found')
    }

    const isMember = await boardRepository.isMember(userId, card.list.boardId)
    if (!isMember) {
      throw new HttpError(403, 'Not a board member')
    }

    return cardRepository.createComment(cardId, userId, content.trim())
  }

  async deleteCard(userId: number, cardId: number) {
    const card = await cardRepository.findByIdWithBoard(cardId)
    if (!card) {
      throw new HttpError(404, 'Not found')
    }

    const isMember = await boardRepository.isMember(userId, card.list.boardId)
    if (!isMember) {
      throw new HttpError(403, 'Not a board member')
    }

    await cardRepository.delete(cardId)
    return { ok: true }
  }
}
