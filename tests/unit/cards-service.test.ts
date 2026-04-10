import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BadRequestError,
  ForbiddenError,
} from '../../src/errors/application-error'
import { CardsService, type CardRepository } from '../../src/services/cards-service'

describe('CardsService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('creates cards at the next available position for board members', async () => {
    const cardRepository: CardRepository = {
      createCard: vi.fn().mockImplementation(async (input) => ({
        assigneeId: input.assigneeId ?? null,
        createdAt: new Date(),
        description: input.description ?? null,
        dueDate: null,
        id: 10,
        listId: input.listId,
        position: input.position,
        title: input.title,
      })),
      createComment: vi.fn(),
      deleteCard: vi.fn(),
      findCardById: vi.fn(),
      findCardDetailsById: vi.fn(),
      findListById: vi.fn().mockResolvedValue({
        boardId: 5,
        id: 2,
        name: 'Backlog',
        position: 0,
      }),
      findMemberRole: vi.fn().mockResolvedValue('member'),
      findNextPosition: vi.fn().mockResolvedValue(4),
      moveCard: vi.fn(),
    }

    const service = new CardsService(cardRepository)
    const card = await service.createCard(1, {
      listId: 2,
      title: 'New card',
    })

    expect(card.position).toBe(4)
    expect(cardRepository.createCard).toHaveBeenCalledWith({
      listId: 2,
      position: 4,
      title: 'New card',
    })
  })

  it('rejects card moves with negative positions', async () => {
    const cardRepository: CardRepository = {
      createCard: vi.fn(),
      createComment: vi.fn(),
      deleteCard: vi.fn(),
      findCardById: vi.fn(),
      findCardDetailsById: vi.fn(),
      findListById: vi.fn(),
      findMemberRole: vi.fn(),
      findNextPosition: vi.fn(),
      moveCard: vi.fn(),
    }

    const service = new CardsService(cardRepository)

    await expect(
      service.moveCard(1, 2, { position: -1, targetListId: 7 }),
    ).rejects.toBeInstanceOf(BadRequestError)
    expect(cardRepository.findCardById).not.toHaveBeenCalled()
  })

  it('rejects moves to lists in a different board', async () => {
    const cardRepository: CardRepository = {
      createCard: vi.fn(),
      createComment: vi.fn(),
      deleteCard: vi.fn(),
      findCardById: vi.fn().mockResolvedValue({
        assigneeId: null,
        createdAt: new Date(),
        description: null,
        dueDate: null,
        id: 2,
        list: { boardId: 1, id: 9 },
        listId: 9,
        position: 0,
        title: 'Card',
      }),
      findCardDetailsById: vi.fn(),
      findListById: vi.fn().mockResolvedValue({
        boardId: 2,
        id: 7,
        name: 'Foreign',
        position: 0,
      }),
      findMemberRole: vi.fn().mockResolvedValue('member'),
      findNextPosition: vi.fn(),
      moveCard: vi.fn(),
    }

    const service = new CardsService(cardRepository)

    await expect(
      service.moveCard(1, 2, { position: 0, targetListId: 7 }),
    ).rejects.toBeInstanceOf(BadRequestError)
    expect(cardRepository.moveCard).not.toHaveBeenCalled()
  })

  it('forbids access to cards outside the user board memberships', async () => {
    const cardRepository: CardRepository = {
      createCard: vi.fn(),
      createComment: vi.fn(),
      deleteCard: vi.fn(),
      findCardById: vi.fn().mockResolvedValue({
        assigneeId: null,
        createdAt: new Date(),
        description: null,
        dueDate: null,
        id: 2,
        list: { boardId: 1, id: 9 },
        listId: 9,
        position: 0,
        title: 'Card',
      }),
      findCardDetailsById: vi.fn(),
      findListById: vi.fn(),
      findMemberRole: vi.fn().mockResolvedValue(null),
      findNextPosition: vi.fn(),
      moveCard: vi.fn(),
    }

    const service = new CardsService(cardRepository)

    await expect(service.getCard(4, 2)).rejects.toBeInstanceOf(ForbiddenError)
  })
})
