import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BoardService } from './BoardService'
import type { IBoardRepository } from '../repositories/IBoardRepository'

function makeMockBoardRepo(): IBoardRepository {
  return {
    findAllForUser: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    addMember: vi.fn(),
    getMembership: vi.fn(),
  }
}

describe('BoardService', () => {
  let boardRepo: IBoardRepository
  let boardService: BoardService

  beforeEach(() => {
    boardRepo = makeMockBoardRepo()
    boardService = new BoardService(boardRepo)
    vi.clearAllMocks()
  })

  describe('getBoardsForUser', () => {
    it('returns boards for the given user', async () => {
      const mockBoards = [{ id: 1, name: 'Board A', createdAt: new Date() }] as any
      vi.mocked(boardRepo.findAllForUser).mockResolvedValueOnce(mockBoards)

      const result = await boardService.getBoardsForUser(1)

      expect(boardRepo.findAllForUser).toHaveBeenCalledWith(1)
      expect(result).toEqual(mockBoards)
    })
  })

  describe('getBoard', () => {
    it('returns board detail when user is a member', async () => {
      const mockMembership = { userId: 1, boardId: 1, role: 'owner' }
      const mockBoard = { id: 1, name: 'Board A', createdAt: new Date(), lists: [] } as any
      vi.mocked(boardRepo.getMembership).mockResolvedValueOnce(mockMembership as any)
      vi.mocked(boardRepo.findById).mockResolvedValueOnce(mockBoard)

      const result = await boardService.getBoard(1, 1)

      expect(result).toEqual(mockBoard)
    })

    it('throws 403 when user is not a board member', async () => {
      vi.mocked(boardRepo.getMembership).mockResolvedValueOnce(null)

      await expect(boardService.getBoard(99, 1)).rejects.toMatchObject({
        message: 'Not a board member',
        status: 403,
      })
    })

    it('throws 404 when board does not exist', async () => {
      const mockMembership = { userId: 1, boardId: 1, role: 'member' }
      vi.mocked(boardRepo.getMembership).mockResolvedValueOnce(mockMembership as any)
      vi.mocked(boardRepo.findById).mockResolvedValueOnce(null)

      await expect(boardService.getBoard(1, 1)).rejects.toMatchObject({
        message: 'Board not found',
        status: 404,
      })
    })
  })

  describe('createBoard', () => {
    it('delegates to boardRepo.create with name and ownerUserId', async () => {
      const mockBoard = { id: 2, name: 'New Board', createdAt: new Date() } as any
      vi.mocked(boardRepo.create).mockResolvedValueOnce(mockBoard)

      const result = await boardService.createBoard('New Board', 5)

      expect(boardRepo.create).toHaveBeenCalledWith('New Board', 5)
      expect(result).toEqual(mockBoard)
    })
  })

  describe('addMember', () => {
    it('adds a member with role "member"', async () => {
      vi.mocked(boardRepo.addMember).mockResolvedValueOnce(undefined)

      await boardService.addMember(1, 10, 20)

      expect(boardRepo.addMember).toHaveBeenCalledWith(20, 10, 'member')
    })
  })
})
