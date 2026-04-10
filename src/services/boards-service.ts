import { ForbiddenError, NotFoundError, ValidationError } from '../errors'
import type {
  BoardDetailsRecord,
  BoardsRepository,
} from '../repositories/boards-repository'

export interface BoardDetailsResponse {
  readonly id: number
  readonly name: string
  readonly createdAt: Date
  readonly lists: ReadonlyArray<{
    readonly id: number
    readonly name: string
    readonly position: number
    readonly boardId: number
    readonly cards: ReadonlyArray<{
      readonly id: number
      readonly title: string
      readonly description: string | null
      readonly position: number
      readonly dueDate: Date | null
      readonly listId: number
      readonly assigneeId: number | null
      readonly createdAt: Date
      readonly comments: ReadonlyArray<{
        readonly id: number
        readonly content: string
        readonly createdAt: Date
        readonly cardId: number
        readonly userId: number
      }>
      readonly labels: ReadonlyArray<{
        readonly id: number
        readonly name: string
        readonly color: string
      }>
    }>
  }>
}

export interface BoardsService {
  listForUser(userId: number): Promise<ReadonlyArray<{ id: number; name: string; createdAt: Date }>>
  getById(boardId: number, userId: number): Promise<BoardDetailsResponse>
  create(name: string, ownerId: number): Promise<{ id: number; name: string; createdAt: Date }>
  addMember(boardId: number, actorId: number, memberId: number): Promise<void>
  assertBoardMember(userId: number, boardId: number): Promise<void>
  assertBoardExists(boardId: number): Promise<void>
}

function toBoardDetailsResponse(board: BoardDetailsRecord): BoardDetailsResponse {
  return {
    id: board.id,
    name: board.name,
    createdAt: board.createdAt,
    lists: board.lists,
  }
}

export function createBoardsService(boardsRepository: BoardsRepository): BoardsService {
  const assertBoardExists = async (boardId: number): Promise<void> => {
    const board = await boardsRepository.findById(boardId)

    if (!board) {
      throw new NotFoundError('Board not found')
    }
  }

  const assertBoardMember = async (userId: number, boardId: number): Promise<void> => {
    const membership = await boardsRepository.findMembership(userId, boardId)

    if (!membership) {
      throw new ForbiddenError('Not a board member')
    }
  }

  return {
    listForUser(userId: number): Promise<ReadonlyArray<{ id: number; name: string; createdAt: Date }>> {
      return boardsRepository.listForUser(userId)
    },

    async getById(boardId: number, userId: number): Promise<BoardDetailsResponse> {
      const board = await boardsRepository.findDetailedBoardById(boardId)

      if (!board) {
        throw new NotFoundError('Board not found')
      }

      const membership = await boardsRepository.findMembership(userId, boardId)

      if (!membership) {
        throw new ForbiddenError('Not a board member')
      }

      return toBoardDetailsResponse(board)
    },

    async create(name: string, ownerId: number): Promise<{ id: number; name: string; createdAt: Date }> {
      if (!name) {
        throw new ValidationError('name is required')
      }

      return boardsRepository.createBoard(name, ownerId)
    },

    async addMember(boardId: number, actorId: number, memberId: number): Promise<void> {
      if (!Number.isInteger(memberId) || memberId <= 0) {
        throw new ValidationError('memberId is required')
      }

      await assertBoardExists(boardId)

      const membership = await boardsRepository.findMembership(actorId, boardId)

      if (!membership || membership.role !== 'owner') {
        throw new ForbiddenError('Only board owners can add members')
      }

      await boardsRepository.addMember(boardId, memberId)
    },

    assertBoardMember,
    assertBoardExists,
  }
}
