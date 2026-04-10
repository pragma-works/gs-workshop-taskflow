import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCardService } from '../cards.service'
import type { ICardRepository, IBoardRepository } from '../../interfaces/repositories'

const makeCardRepo = (): ICardRepository => ({
  findWithDetails: vi.fn(),
  create: vi.fn(),
  moveWithActivity: vi.fn(),
  addComment: vi.fn(),
  delete: vi.fn(),
})

const makeBoardRepo = (): IBoardRepository => ({
  findByUserId: vi.fn(),
  findWithLists: vi.fn(),
  isMember: vi.fn(),
  create: vi.fn(),
  addMember: vi.fn(),
})

describe('CardService', () => {
  let cardRepo: ReturnType<typeof makeCardRepo>
  let boardRepo: ReturnType<typeof makeBoardRepo>

  beforeEach(() => {
    cardRepo = makeCardRepo()
    boardRepo = makeBoardRepo()
  })

  describe('getCard', () => {
    it('throws NotFoundError if card not found', async () => {
      vi.mocked(cardRepo.findWithDetails).mockResolvedValue(null)
      const service = createCardService(cardRepo, boardRepo)
      await expect(service.getCard(99, 1)).rejects.toThrow('Card not found')
    })

    it('returns card if found', async () => {
      const card = { id: 1, title: 'Task', listId: 1, comments: [], labels: [] }
      vi.mocked(cardRepo.findWithDetails).mockResolvedValue(card as any)
      const service = createCardService(cardRepo, boardRepo)
      const result = await service.getCard(1, 1)
      expect(result).toEqual(card)
    })
  })

  describe('createCard', () => {
    it('creates a card', async () => {
      const card = { id: 1, title: 'Task', listId: 1 }
      vi.mocked(cardRepo.create).mockResolvedValue(card as any)

      const service = createCardService(cardRepo, boardRepo)
      const result = await service.createCard({ title: 'Task', listId: 1 }, 1)

      expect(cardRepo.create).toHaveBeenCalledWith({ title: 'Task', listId: 1, assigneeId: undefined })
      expect(result).toEqual(card)
    })
  })

  describe('moveCard', () => {
    it('throws NotFoundError if card does not exist after move', async () => {
      vi.mocked(cardRepo.moveWithActivity).mockResolvedValue(null)
      const service = createCardService(cardRepo, boardRepo)
      await expect(service.moveCard(99, { targetListId: 2, position: 0 }, 1)).rejects.toThrow('Card not found')
    })

    it('returns card and event on success', async () => {
      const result = { card: { id: 1, listId: 2 }, event: { id: 10 } }
      vi.mocked(cardRepo.moveWithActivity).mockResolvedValue(result as any)

      const service = createCardService(cardRepo, boardRepo)
      const response = await service.moveCard(1, { targetListId: 2, position: 0 }, 1)

      expect(response).toEqual(result)
    })
  })

  describe('addComment', () => {
    it('creates a comment', async () => {
      const comment = { id: 1, content: 'Hello', cardId: 1, userId: 1 }
      vi.mocked(cardRepo.addComment).mockResolvedValue(comment as any)

      const service = createCardService(cardRepo, boardRepo)
      const result = await service.addComment({ content: 'Hello', cardId: 1, userId: 1 })

      expect(cardRepo.addComment).toHaveBeenCalledWith({ content: 'Hello', cardId: 1, userId: 1 })
      expect(result).toEqual(comment)
    })
  })

  describe('deleteCard', () => {
    it('calls delete on repo', async () => {
      vi.mocked(cardRepo.delete).mockResolvedValue()
      const service = createCardService(cardRepo, boardRepo)
      await service.deleteCard(1, 1)
      expect(cardRepo.delete).toHaveBeenCalledWith(1)
    })
  })
})
