import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../src/errors/application-error'
import type { BoardAccessAuthorizer } from '../../src/services/board-access-service'
import {
  BoardsService,
  type BoardDetails,
  type BoardMembershipRepository,
  type BoardReadRepository,
  type UserLookupRepository,
} from '../../src/services/boards-service'

describe('BoardsService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('stops after authorization rejects a missing board', async () => {
    const boardReadRepository: BoardReadRepository = {
      createBoard: vi.fn(),
      findBoardDetails: vi.fn(),
      findBoardsForUser: vi.fn(),
    }
    const boardMembershipRepository: BoardMembershipRepository = {
      addMember: vi.fn(),
      findMemberRole: vi.fn(),
    }
    const userLookupRepository: UserLookupRepository = {
      findById: vi.fn(),
    }
    const boardAccessAuthorizer: BoardAccessAuthorizer = {
      assertBoardExists: vi.fn(),
      assertBoardMember: vi.fn().mockRejectedValue(new NotFoundError('Board not found', { boardId: 99 })),
      assertBoardOwner: vi.fn(),
    }

    const service = new BoardsService(
      boardReadRepository,
      boardMembershipRepository,
      userLookupRepository,
      boardAccessAuthorizer,
    )

    await expect(service.getBoardById(1, 99)).rejects.toBeInstanceOf(NotFoundError)
    expect(boardReadRepository.findBoardDetails).not.toHaveBeenCalled()
  })

  it('returns board details for board members', async () => {
    const boardDetails: BoardDetails = {
      createdAt: new Date(),
      id: 3,
      lists: [],
      name: 'Board',
    }
    const boardReadRepository: BoardReadRepository = {
      createBoard: vi.fn(),
      findBoardDetails: vi.fn().mockResolvedValue(boardDetails),
      findBoardsForUser: vi.fn(),
    }
    const boardMembershipRepository: BoardMembershipRepository = {
      addMember: vi.fn(),
      findMemberRole: vi.fn(),
    }
    const userLookupRepository: UserLookupRepository = {
      findById: vi.fn(),
    }
    const boardAccessAuthorizer: BoardAccessAuthorizer = {
      assertBoardExists: vi.fn(),
      assertBoardMember: vi.fn().mockResolvedValue(undefined),
      assertBoardOwner: vi.fn(),
    }

    const service = new BoardsService(
      boardReadRepository,
      boardMembershipRepository,
      userLookupRepository,
      boardAccessAuthorizer,
    )
    const result = await service.getBoardById(1, 3)

    expect(result).toBe(boardDetails)
    expect(boardAccessAuthorizer.assertBoardMember).toHaveBeenCalledWith(1, 3)
  })

  it('only allows board owners to add members', async () => {
    const boardReadRepository: BoardReadRepository = {
      createBoard: vi.fn(),
      findBoardDetails: vi.fn(),
      findBoardsForUser: vi.fn(),
    }
    const boardMembershipRepository: BoardMembershipRepository = {
      addMember: vi.fn(),
      findMemberRole: vi.fn(),
    }
    const userLookupRepository: UserLookupRepository = {
      findById: vi.fn(),
    }
    const boardAccessAuthorizer: BoardAccessAuthorizer = {
      assertBoardExists: vi.fn(),
      assertBoardMember: vi.fn(),
      assertBoardOwner: vi.fn().mockRejectedValue(new ForbiddenError('Not allowed')),
    }

    const service = new BoardsService(
      boardReadRepository,
      boardMembershipRepository,
      userLookupRepository,
      boardAccessAuthorizer,
    )

    await expect(service.addMemberToBoard(1, 3, { memberId: 9 })).rejects.toBeInstanceOf(
      ForbiddenError,
    )
    expect(userLookupRepository.findById).not.toHaveBeenCalled()
  })

  it('rejects duplicate board memberships', async () => {
    const boardReadRepository: BoardReadRepository = {
      createBoard: vi.fn(),
      findBoardDetails: vi.fn(),
      findBoardsForUser: vi.fn(),
    }
    const boardMembershipRepository: BoardMembershipRepository = {
      addMember: vi.fn(),
      findMemberRole: vi.fn().mockResolvedValue('member'),
    }
    const userLookupRepository: UserLookupRepository = {
      findById: vi.fn().mockResolvedValue({ id: 9 }),
    }
    const boardAccessAuthorizer: BoardAccessAuthorizer = {
      assertBoardExists: vi.fn(),
      assertBoardMember: vi.fn(),
      assertBoardOwner: vi.fn().mockResolvedValue(undefined),
    }

    const service = new BoardsService(
      boardReadRepository,
      boardMembershipRepository,
      userLookupRepository,
      boardAccessAuthorizer,
    )

    await expect(service.addMemberToBoard(1, 3, { memberId: 9 })).rejects.toBeInstanceOf(
      ConflictError,
    )
  })
})
