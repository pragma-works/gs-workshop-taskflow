import { ForbiddenError, NotFoundError, ValidationError } from '../shared/errors'

export interface BoardSummary {
  id: number
  name: string
  createdAt: Date
}

export interface BoardComment {
  id: number
  content: string
  createdAt: Date
  cardId: number
  userId: number
}

export interface BoardLabel {
  id: number
  name: string
  color: string
}

export interface BoardCard {
  id: number
  title: string
  description: string | null
  position: number
  dueDate: Date | null
  listId: number
  assigneeId: number | null
  createdAt: Date
  comments: BoardComment[]
  labels: BoardLabel[]
}

export interface BoardList {
  id: number
  name: string
  position: number
  boardId: number
  cards: BoardCard[]
}

export interface BoardDetail extends BoardSummary {
  lists: BoardList[]
}

export interface BoardRepository {
  listBoardsForUser(userId: number): Promise<BoardSummary[]>
  findBoardById(boardId: number): Promise<BoardSummary | null>
  findBoardDetail(boardId: number): Promise<BoardDetail | null>
  findMemberRole(userId: number, boardId: number): Promise<string | null>
  createBoardWithOwner(name: string, ownerId: number): Promise<BoardSummary>
  addMember(boardId: number, memberId: number): Promise<void>
}

export interface BoardService {
  listBoards(userId: number): Promise<BoardSummary[]>
  getBoard(userId: number, boardId: number): Promise<BoardDetail>
  createBoard(userId: number, name: string): Promise<BoardSummary>
  addMember(userId: number, boardId: number, memberId: number): Promise<void>
}

interface BoardServiceDependencies {
  boardRepository: BoardRepository
}

function requirePositiveInteger(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ValidationError(`Invalid ${fieldName}`)
  }

  return value
}

function requireBoardName(name: string): string {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new ValidationError('Board name is required')
  }

  return name.trim()
}

/**
 * Creates board use cases backed by the provided repository port.
 *
 * @param {BoardServiceDependencies} dependencies - Repository dependencies required by the service.
 * @returns {BoardService} Board service API.
 */
export function createBoardService({ boardRepository }: BoardServiceDependencies): BoardService {
  return {
    listBoards(userId: number): Promise<BoardSummary[]> {
      return boardRepository.listBoardsForUser(requirePositiveInteger(userId, 'user id'))
    },

    async getBoard(userId: number, boardId: number): Promise<BoardDetail> {
      const normalizedUserId = requirePositiveInteger(userId, 'user id')
      const normalizedBoardId = requirePositiveInteger(boardId, 'board id')
      const board = await boardRepository.findBoardById(normalizedBoardId)

      if (!board) {
        throw new NotFoundError('Board not found')
      }

      const membershipRole = await boardRepository.findMemberRole(normalizedUserId, normalizedBoardId)
      if (!membershipRole) {
        throw new ForbiddenError('Not a board member')
      }

      const detail = await boardRepository.findBoardDetail(normalizedBoardId)
      if (!detail) {
        throw new NotFoundError('Board not found')
      }

      return detail
    },

    createBoard(userId: number, name: string): Promise<BoardSummary> {
      return boardRepository.createBoardWithOwner(
        requireBoardName(name),
        requirePositiveInteger(userId, 'user id'),
      )
    },

    async addMember(userId: number, boardId: number, memberId: number): Promise<void> {
      const normalizedUserId = requirePositiveInteger(userId, 'user id')
      const normalizedBoardId = requirePositiveInteger(boardId, 'board id')
      const normalizedMemberId = requirePositiveInteger(memberId, 'member id')
      const board = await boardRepository.findBoardById(normalizedBoardId)

      if (!board) {
        throw new NotFoundError('Board not found')
      }

      const membershipRole = await boardRepository.findMemberRole(normalizedUserId, normalizedBoardId)
      if (membershipRole !== 'owner') {
        throw new ForbiddenError('Only board owners can add members')
      }

      await boardRepository.addMember(normalizedBoardId, normalizedMemberId)
    },
  }
}
