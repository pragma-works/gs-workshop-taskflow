import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createActivityService } from '../activity.service'
import type { IActivityRepository, IBoardRepository } from '../../interfaces/repositories'

const makeActivityRepo = (): IActivityRepository => ({
  getByBoard: vi.fn(),
})

const makeBoardRepo = (): IBoardRepository => ({
  findByUserId: vi.fn(),
  findWithLists: vi.fn(),
  isMember: vi.fn(),
  create: vi.fn(),
  addMember: vi.fn(),
})

describe('ActivityService', () => {
  let activityRepo: ReturnType<typeof makeActivityRepo>
  let boardRepo: ReturnType<typeof makeBoardRepo>

  beforeEach(() => {
    activityRepo = makeActivityRepo()
    boardRepo = makeBoardRepo()
  })

  describe('getBoardActivity', () => {
    it('throws ForbiddenError if user is not a board member', async () => {
      vi.mocked(boardRepo.isMember).mockResolvedValue(false)

      const service = createActivityService(activityRepo, boardRepo)
      await expect(service.getBoardActivity(1, 99)).rejects.toThrow('Access denied')
    })

    it('returns events if user is a member', async () => {
      vi.mocked(boardRepo.isMember).mockResolvedValue(true)
      const events = [{ id: 1, eventType: 'CARD_MOVED' }]
      vi.mocked(activityRepo.getByBoard).mockResolvedValue(events as any)

      const service = createActivityService(activityRepo, boardRepo)
      const result = await service.getBoardActivity(1, 1)

      expect(result).toEqual(events)
    })

    it('forwards pagination to the repository', async () => {
      vi.mocked(boardRepo.isMember).mockResolvedValue(true)
      vi.mocked(activityRepo.getByBoard).mockResolvedValue([])

      const service = createActivityService(activityRepo, boardRepo)
      await service.getBoardActivity(1, 1, { page: 2, limit: 5 })

      expect(activityRepo.getByBoard).toHaveBeenCalledWith(1, { page: 2, limit: 5 })
    })
  })

  describe('getPreview', () => {
    it('passes limit 5 to repository', async () => {
      vi.mocked(activityRepo.getByBoard).mockResolvedValue([])

      const service = createActivityService(activityRepo, boardRepo)
      await service.getPreview(1)

      expect(activityRepo.getByBoard).toHaveBeenCalledWith(1, { page: 1, limit: 5 })
    })
  })
})
