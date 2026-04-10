import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CardService } from './CardService'
import type { ICardRepository } from '../repositories/ICardRepository'

function makeMockCardRepo(): ICardRepository {
  return {
    findById: vi.fn(),
    create: vi.fn(),
    moveWithActivity: vi.fn(),
    addComment: vi.fn(),
    delete: vi.fn(),
  }
}

describe('CardService', () => {
  let cardRepo: ICardRepository
  let cardService: CardService

  beforeEach(() => {
    cardRepo = makeMockCardRepo()
    cardService = new CardService(cardRepo)
    vi.clearAllMocks()
  })

  describe('getCard', () => {
    it('returns card when found', async () => {
      const mockCard = { id: 1, title: 'Fix bug', listId: 2, list: { boardId: 1 } } as any
      vi.mocked(cardRepo.findById).mockResolvedValueOnce(mockCard)

      const result = await cardService.getCard(1)

      expect(result).toEqual(mockCard)
    })

    it('throws 404 when card not found', async () => {
      vi.mocked(cardRepo.findById).mockResolvedValueOnce(null)

      await expect(cardService.getCard(999)).rejects.toMatchObject({ message: 'Not found', status: 404 })
    })
  })

  describe('createCard', () => {
    it('delegates creation to repository', async () => {
      const data = { title: 'New task', listId: 1 }
      const mockCard = { id: 5, title: 'New task', listId: 1, position: 0 } as any
      vi.mocked(cardRepo.create).mockResolvedValueOnce(mockCard)

      const result = await cardService.createCard(data)

      expect(cardRepo.create).toHaveBeenCalledWith(data)
      expect(result).toEqual(mockCard)
    })
  })

  describe('moveCard', () => {
    it('moves card and returns activity event', async () => {
      const mockCard = { id: 7, listId: 10, list: { boardId: 3 } } as any
      const mockEvent = { id: 1, boardId: 3, actorId: 42, eventType: 'card_moved', cardId: 7, fromListId: 10, toListId: 20, createdAt: new Date() }
      vi.mocked(cardRepo.findById).mockResolvedValueOnce(mockCard)
      vi.mocked(cardRepo.moveWithActivity).mockResolvedValueOnce(mockEvent)

      const result = await cardService.moveCard(7, 20, 0, 42)

      expect(cardRepo.moveWithActivity).toHaveBeenCalledWith(7, 20, 0, 42, 3, 10)
      expect(result).toEqual(mockEvent)
    })

    it('throws 404 when card does not exist', async () => {
      vi.mocked(cardRepo.findById).mockResolvedValueOnce(null)

      await expect(cardService.moveCard(999, 1, 0, 1)).rejects.toMatchObject({ message: 'Not found', status: 404 })
    })
  })

  describe('addComment', () => {
    it('delegates to repository', async () => {
      const mockComment = { id: 1, content: 'Great work', cardId: 7, userId: 1, createdAt: new Date() } as any
      vi.mocked(cardRepo.addComment).mockResolvedValueOnce(mockComment)

      const result = await cardService.addComment(7, 1, 'Great work')

      expect(cardRepo.addComment).toHaveBeenCalledWith(7, 1, 'Great work')
      expect(result).toEqual(mockComment)
    })
  })

  describe('deleteCard', () => {
    it('delegates deletion to repository', async () => {
      vi.mocked(cardRepo.delete).mockResolvedValueOnce(undefined)

      await cardService.deleteCard(5)

      expect(cardRepo.delete).toHaveBeenCalledWith(5)
    })
  })
})
