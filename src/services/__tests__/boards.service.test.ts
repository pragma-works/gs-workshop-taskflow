import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createBoardService } from '../boards.service'
import type { IBoardRepository } from '../../interfaces/repositories'

const makeRepo = (): IBoardRepository => ({
  findByUserId: vi.fn(),
  findWithLists: vi.fn(),
  isMember: vi.fn(),
  create: vi.fn(),
  addMember: vi.fn(),
})

describe('BoardService', () => {
  let repo: ReturnType<typeof makeRepo>

  beforeEach(() => {
    repo = makeRepo()
  })

  describe('getUserBoards', () => {
    it('returns boards for a user', async () => {
      const boards = [{ id: 1, name: 'Sprint 1' }]
      vi.mocked(repo.findByUserId).mockResolvedValue(boards as any)

      const service = createBoardService(repo)
      const result = await service.getUserBoards(1)

      expect(repo.findByUserId).toHaveBeenCalledWith(1)
      expect(result).toEqual(boards)
    })
  })

  describe('getBoard', () => {
    it('throws ForbiddenError if user is not a member', async () => {
      vi.mocked(repo.isMember).mockResolvedValue(false)

      const service = createBoardService(repo)
      await expect(service.getBoard(1, 99)).rejects.toThrow('Access denied')
    })

    it('throws NotFoundError if board does not exist', async () => {
      vi.mocked(repo.isMember).mockResolvedValue(true)
      vi.mocked(repo.findWithLists).mockResolvedValue(null)

      const service = createBoardService(repo)
      await expect(service.getBoard(999, 1)).rejects.toThrow('Board not found')
    })

    it('returns board if user is a member', async () => {
      const board = { id: 1, name: 'Board', lists: [] }
      vi.mocked(repo.findWithLists).mockResolvedValue(board as any)
      vi.mocked(repo.isMember).mockResolvedValue(true)

      const service = createBoardService(repo)
      const result = await service.getBoard(1, 1)

      expect(result).toEqual(board)
    })
  })

  describe('createBoard', () => {
    it('creates a board and returns it', async () => {
      const board = { id: 1, name: 'New Board' }
      vi.mocked(repo.create).mockResolvedValue(board as any)

      const service = createBoardService(repo)
      const result = await service.createBoard('New Board', 1)

      expect(repo.create).toHaveBeenCalledWith('New Board', 1)
      expect(result).toEqual(board)
    })
  })

  describe('addMember', () => {
    it('throws NotFoundError if board does not exist', async () => {
      vi.mocked(repo.findWithLists).mockResolvedValue(null)

      const service = createBoardService(repo)
      await expect(service.addMember(999, 2, 1)).rejects.toThrow('Board not found')
    })

    it('throws ForbiddenError if requesting user is not a member', async () => {
      vi.mocked(repo.findWithLists).mockResolvedValue({ id: 1 } as any)
      vi.mocked(repo.isMember).mockResolvedValue(false)

      const service = createBoardService(repo)
      await expect(service.addMember(1, 2, 99)).rejects.toThrow('Access denied')
    })

    it('calls addMember on repo if authorized', async () => {
      vi.mocked(repo.findWithLists).mockResolvedValue({ id: 1 } as any)
      vi.mocked(repo.isMember).mockResolvedValue(true)
      vi.mocked(repo.addMember).mockResolvedValue()

      const service = createBoardService(repo)
      await service.addMember(1, 2, 1)

      expect(repo.addMember).toHaveBeenCalledWith(1, 2)
    })
  })
})
