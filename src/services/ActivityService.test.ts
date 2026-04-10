import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ActivityService } from './ActivityService'
import type { IBoardRepository } from '../repositories/IBoardRepository'
import type { IActivityRepository } from '../repositories/IActivityRepository'

function makeMockBoardRepo(): IBoardRepository {
  return {
    findAllForUser: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    addMember: vi.fn(),
    getMembership: vi.fn(),
  }
}

function makeMockActivityRepo(): IActivityRepository {
  return {
    findByBoard: vi.fn(),
  }
}

describe('ActivityService', () => {
  let boardRepo: IBoardRepository
  let activityRepo: IActivityRepository
  let activityService: ActivityService

  beforeEach(() => {
    boardRepo = makeMockBoardRepo()
    activityRepo = makeMockActivityRepo()
    activityService = new ActivityService(boardRepo, activityRepo)
    vi.clearAllMocks()
  })

  describe('getFeedAuthenticated', () => {
    it('returns events when user is a board member', async () => {
      const mockMembership = { userId: 1, boardId: 1, role: 'member' }
      const mockEvents = [{ id: 1, boardId: 1, actorId: 1, eventType: 'card_moved', actorName: 'Alice', cardTitle: null, fromListName: null, toListName: null, cardId: null, fromListId: null, toListId: null, createdAt: new Date() }]
      vi.mocked(boardRepo.getMembership).mockResolvedValueOnce(mockMembership as any)
      vi.mocked(activityRepo.findByBoard).mockResolvedValueOnce(mockEvents)

      const result = await activityService.getFeedAuthenticated(1, 1)

      expect(result).toEqual(mockEvents)
    })

    it('throws 403 when user is not a member', async () => {
      vi.mocked(boardRepo.getMembership).mockResolvedValueOnce(null)

      await expect(activityService.getFeedAuthenticated(99, 1)).rejects.toMatchObject({
        message: 'Not a board member',
        status: 403,
      })
    })
  })

  describe('getFeedPreview', () => {
    it('returns events without authentication check', async () => {
      const mockEvents = [{ id: 2, boardId: 1, actorId: 1, eventType: 'card_moved', actorName: 'Bob', cardTitle: 'Task', fromListName: 'To Do', toListName: 'Done', cardId: 1, fromListId: 1, toListId: 2, createdAt: new Date() }]
      vi.mocked(activityRepo.findByBoard).mockResolvedValueOnce(mockEvents)

      const result = await activityService.getFeedPreview(1)

      expect(boardRepo.getMembership).not.toHaveBeenCalled()
      expect(activityRepo.findByBoard).toHaveBeenCalledWith(1)
      expect(result).toEqual(mockEvents)
    })
  })
})
