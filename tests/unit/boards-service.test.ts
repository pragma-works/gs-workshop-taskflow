import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../src/errors/application-error'
import {
  BoardsService,
  type BoardDetails,
  type BoardRepository,
  type UserLookupRepository,
} from '../../src/services/boards-service'

describe('BoardsService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns not found before checking membership when the board does not exist', async () => {
    const boardRepository: BoardRepository = {
      addMember: vi.fn(),
      createBoard: vi.fn(),
      findBoardById: vi.fn().mockResolvedValue(null),
      findBoardDetails: vi.fn(),
      findBoardsForUser: vi.fn(),
      findMemberRole: vi.fn(),
    }
    const userLookupRepository: UserLookupRepository = {
      findById: vi.fn(),
    }

    const service = new BoardsService(boardRepository, userLookupRepository)

    await expect(service.getBoardById(1, 99)).rejects.toBeInstanceOf(NotFoundError)
    expect(boardRepository.findMemberRole).not.toHaveBeenCalled()
  })

  it('returns board details for board members', async () => {
    const boardDetails: BoardDetails = {
      createdAt: new Date(),
      id: 3,
      lists: [],
      name: 'Board',
    }
    const boardRepository: BoardRepository = {
      addMember: vi.fn(),
      createBoard: vi.fn(),
      findBoardById: vi.fn().mockResolvedValue({
        createdAt: new Date(),
        id: 3,
        name: 'Board',
      }),
      findBoardDetails: vi.fn().mockResolvedValue(boardDetails),
      findBoardsForUser: vi.fn(),
      findMemberRole: vi.fn().mockResolvedValue('member'),
    }
    const userLookupRepository: UserLookupRepository = {
      findById: vi.fn(),
    }

    const service = new BoardsService(boardRepository, userLookupRepository)
    const result = await service.getBoardById(1, 3)

    expect(result).toBe(boardDetails)
  })

  it('only allows board owners to add members', async () => {
    const boardRepository: BoardRepository = {
      addMember: vi.fn(),
      createBoard: vi.fn(),
      findBoardById: vi.fn().mockResolvedValue({
        createdAt: new Date(),
        id: 3,
        name: 'Board',
      }),
      findBoardDetails: vi.fn(),
      findBoardsForUser: vi.fn(),
      findMemberRole: vi.fn().mockResolvedValue('member'),
    }
    const userLookupRepository: UserLookupRepository = {
      findById: vi.fn(),
    }

    const service = new BoardsService(boardRepository, userLookupRepository)

    await expect(service.addMemberToBoard(1, 3, { memberId: 9 })).rejects.toBeInstanceOf(
      ForbiddenError,
    )
    expect(userLookupRepository.findById).not.toHaveBeenCalled()
  })

  it('rejects duplicate board memberships', async () => {
    const boardRepository: BoardRepository = {
      addMember: vi.fn(),
      createBoard: vi.fn(),
      findBoardById: vi.fn().mockResolvedValue({
        createdAt: new Date(),
        id: 3,
        name: 'Board',
      }),
      findBoardDetails: vi.fn(),
      findBoardsForUser: vi.fn(),
      findMemberRole: vi
        .fn()
        .mockResolvedValueOnce('owner')
        .mockResolvedValueOnce('member'),
    }
    const userLookupRepository: UserLookupRepository = {
      findById: vi.fn().mockResolvedValue({ id: 9 }),
    }

    const service = new BoardsService(boardRepository, userLookupRepository)

    await expect(service.addMemberToBoard(1, 3, { memberId: 9 })).rejects.toBeInstanceOf(
      ConflictError,
    )
  })
})
