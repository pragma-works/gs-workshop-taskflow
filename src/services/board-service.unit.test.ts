import { describe, expect, it, vi } from 'vitest'
import { ForbiddenError, NotFoundError } from '../errors'
import { assertBoardOwner, getBoardDetailsForUser, listBoardsForUser } from './board-service'

describe('board service', () => {
  it('returns boards linked through memberships', async () => {
    const result = await listBoardsForUser(1, {
      boardRepository: {
        findMembership: vi.fn(),
        findBoardsForUser: vi.fn().mockResolvedValue([
          { board: { id: 1, name: 'Alpha' } },
          { board: { id: 2, name: 'Beta' } },
        ]),
        findBoardDetails: vi.fn(),
        createBoardWithOwner: vi.fn(),
        addMember: vi.fn(),
      },
    })

    expect(result).toEqual([
      { id: 1, name: 'Alpha' },
      { id: 2, name: 'Beta' },
    ])
  })

  it('rejects non-owner users when adding board members', async () => {
    await expect(assertBoardOwner(1, 7, {
      boardRepository: {
        findMembership: vi.fn().mockResolvedValue({ userId: 1, boardId: 7, role: 'member' }),
        findBoardsForUser: vi.fn(),
        findBoardDetails: vi.fn(),
        createBoardWithOwner: vi.fn(),
        addMember: vi.fn(),
      },
    })).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('throws when board details are missing after membership passes', async () => {
    await expect(getBoardDetailsForUser(1, 7, {
      boardRepository: {
        findMembership: vi.fn().mockResolvedValue({ userId: 1, boardId: 7, role: 'owner' }),
        findBoardsForUser: vi.fn(),
        findBoardDetails: vi.fn().mockResolvedValue(null),
        createBoardWithOwner: vi.fn(),
        addMember: vi.fn(),
      },
    })).rejects.toBeInstanceOf(NotFoundError)
  })
})