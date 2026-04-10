import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ForbiddenError,
  NotFoundError,
} from '../../src/errors/application-error'
import {
  BoardAccessService,
  type BoardAccessRepository,
} from '../../src/services/board-access-service'

describe('BoardAccessService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns not found before checking membership when the board does not exist', async () => {
    const boardAccessRepository: BoardAccessRepository = {
      findBoardById: vi.fn().mockResolvedValue(null),
      findMemberRole: vi.fn(),
    }

    const service = new BoardAccessService(boardAccessRepository)

    await expect(service.assertBoardMember(1, 99)).rejects.toBeInstanceOf(NotFoundError)
    expect(boardAccessRepository.findMemberRole).not.toHaveBeenCalled()
  })

  it('forbids users that are not board members', async () => {
    const boardAccessRepository: BoardAccessRepository = {
      findBoardById: vi.fn().mockResolvedValue({
        createdAt: new Date(),
        id: 7,
        name: 'Board',
      }),
      findMemberRole: vi.fn().mockResolvedValue(null),
    }

    const service = new BoardAccessService(boardAccessRepository)

    await expect(service.assertBoardMember(4, 7)).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('requires the owner role for owner-only board actions', async () => {
    const boardAccessRepository: BoardAccessRepository = {
      findBoardById: vi.fn().mockResolvedValue({
        createdAt: new Date(),
        id: 7,
        name: 'Board',
      }),
      findMemberRole: vi.fn().mockResolvedValue('member'),
    }

    const service = new BoardAccessService(boardAccessRepository)

    await expect(service.assertBoardOwner(4, 7)).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('accepts owners for owner-only board actions', async () => {
    const boardAccessRepository: BoardAccessRepository = {
      findBoardById: vi.fn().mockResolvedValue({
        createdAt: new Date(),
        id: 7,
        name: 'Board',
      }),
      findMemberRole: vi.fn().mockResolvedValue('owner'),
    }

    const service = new BoardAccessService(boardAccessRepository)

    await expect(service.assertBoardOwner(4, 7)).resolves.toBeUndefined()
  })
})
