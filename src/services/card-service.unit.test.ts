import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotFoundError, ValidationError } from '../errors'

const { assertBoardMemberMock } = vi.hoisted(() => ({
  assertBoardMemberMock: vi.fn(),
}))

vi.mock('./board-service', async () => {
  const actual = await vi.importActual<typeof import('./board-service')>('./board-service')
  return {
    ...actual,
    assertBoardMember: assertBoardMemberMock,
  }
})

import { moveCardForUser } from './card-service'

describe('card service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assertBoardMemberMock.mockResolvedValue(undefined)
  })

  it('throws when the target list does not exist', async () => {
    await expect(moveCardForUser(1, 10, 99, 0, {
      cardRepository: {
        findCardDetails: vi.fn(),
        findCardWithList: vi.fn().mockResolvedValue({
          id: 10,
          listId: 1,
          list: { id: 1, boardId: 7 },
        }),
        findListById: vi.fn().mockResolvedValue(null),
        countCardsInList: vi.fn(),
        createCard: vi.fn(),
        moveCardAndCreateActivity: vi.fn(),
        createComment: vi.fn(),
        deleteCard: vi.fn(),
      },
    })).rejects.toBeInstanceOf(NotFoundError)
  })

  it('throws when the target list belongs to another board', async () => {
    await expect(moveCardForUser(1, 10, 99, 0, {
      cardRepository: {
        findCardDetails: vi.fn(),
        findCardWithList: vi.fn().mockResolvedValue({
          id: 10,
          listId: 1,
          list: { id: 1, boardId: 7 },
        }),
        findListById: vi.fn().mockResolvedValue({ id: 99, boardId: 8 }),
        countCardsInList: vi.fn(),
        createCard: vi.fn(),
        moveCardAndCreateActivity: vi.fn(),
        createComment: vi.fn(),
        deleteCard: vi.fn(),
      },
    })).rejects.toBeInstanceOf(ValidationError)
  })

  it('delegates the atomic card move to the repository when validation succeeds', async () => {
    const moveCardAndCreateActivity = vi.fn().mockResolvedValue({ id: 5, eventType: 'card_moved' })

    const result = await moveCardForUser(1, 10, 99, 3, {
      cardRepository: {
        findCardDetails: vi.fn(),
        findCardWithList: vi.fn().mockResolvedValue({
          id: 10,
          listId: 1,
          list: { id: 1, boardId: 7 },
        }),
        findListById: vi.fn().mockResolvedValue({ id: 99, boardId: 7 }),
        countCardsInList: vi.fn(),
        createCard: vi.fn(),
        moveCardAndCreateActivity,
        createComment: vi.fn(),
        deleteCard: vi.fn(),
      },
    })

    expect(assertBoardMemberMock).toHaveBeenCalledWith(1, 7)
    expect(moveCardAndCreateActivity).toHaveBeenCalledWith({
      cardId: 10,
      position: 3,
      targetListId: 99,
      boardId: 7,
      actorId: 1,
      fromListId: 1,
    })
    expect(result).toEqual({ id: 5, eventType: 'card_moved' })
  })
})