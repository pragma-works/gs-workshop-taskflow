import type { BoardDetailsRecord, BoardRecord } from '../domain/models'
import { ConflictError, ForbiddenError, NotFoundError } from '../errors/application-error'

export type BoardRole = 'member' | 'owner'

export interface BoardRepository {
  addMember(boardId: number, memberId: number, role: BoardRole): Promise<void>
  createBoard(name: string, ownerId: number): Promise<BoardRecord>
  findBoardById(boardId: number): Promise<BoardRecord | null>
  findBoardDetails(boardId: number): Promise<BoardDetailsRecord | null>
  findBoardsForUser(userId: number): Promise<readonly BoardRecord[]>
  findMemberRole(userId: number, boardId: number): Promise<BoardRole | null>
}

export interface UserLookupRepository {
  findById(userId: number): Promise<{ id: number } | null>
}

export interface CreateBoardInput {
  readonly name: string
}

export interface AddBoardMemberInput {
  readonly memberId: number
}

/** Coordinates board reads and membership-based authorization. */
export class BoardsService {
  /** @param boardRepository Persistence port for boards. @param userLookupRepository User lookup port. */
  public constructor(
    private readonly boardRepository: BoardRepository,
    private readonly userLookupRepository: UserLookupRepository,
  ) {}

  /** Lists boards the current user belongs to. */
  public async listBoardsForUser(userId: number): Promise<readonly BoardRecord[]> {
    return this.boardRepository.findBoardsForUser(userId)
  }

  /** Returns a board with lists, cards, comments, and labels for a member. */
  public async getBoardById(userId: number, boardId: number): Promise<BoardDetailsRecord> {
    await this.assertBoardMember(userId, boardId)

    const board = await this.boardRepository.findBoardDetails(boardId)
    if (board === null) {
      throw new NotFoundError('Board not found', { boardId })
    }

    return board
  }

  /** Creates a board and its owner membership. */
  public async createBoard(userId: number, input: CreateBoardInput): Promise<BoardRecord> {
    return this.boardRepository.createBoard(input.name, userId)
  }

  /** Adds a new member to a board owned by the current user. */
  public async addMemberToBoard(
    userId: number,
    boardId: number,
    input: AddBoardMemberInput,
  ): Promise<void> {
    await this.assertBoardOwner(userId, boardId)

    const member = await this.userLookupRepository.findById(input.memberId)
    if (member === null) {
      throw new NotFoundError('User not found', { userId: input.memberId })
    }

    const existingRole = await this.boardRepository.findMemberRole(input.memberId, boardId)
    if (existingRole !== null) {
      throw new ConflictError('User is already a board member', {
        boardId,
        userId: input.memberId,
      })
    }

    await this.boardRepository.addMember(boardId, input.memberId, 'member')
  }

  /** Verifies that a user belongs to the target board. */
  public async assertBoardMember(userId: number, boardId: number): Promise<void> {
    const board = await this.boardRepository.findBoardById(boardId)
    if (board === null) {
      throw new NotFoundError('Board not found', { boardId })
    }

    const role = await this.boardRepository.findMemberRole(userId, boardId)
    if (role === null) {
      throw new ForbiddenError('Not a board member', { boardId, userId })
    }
  }

  /** Verifies that a user owns the target board. */
  public async assertBoardOwner(userId: number, boardId: number): Promise<void> {
    const board = await this.boardRepository.findBoardById(boardId)
    if (board === null) {
      throw new NotFoundError('Board not found', { boardId })
    }

    const role = await this.boardRepository.findMemberRole(userId, boardId)
    if (role !== 'owner') {
      throw new ForbiddenError('Only board owners can manage members', { boardId, userId })
    }
  }
}
