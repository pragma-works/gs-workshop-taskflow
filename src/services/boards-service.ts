import type { BoardDetailsRecord, BoardRecord, BoardRole } from '../domain/models'
import { ConflictError, NotFoundError } from '../errors/application-error'
import type { BoardAccessAuthorizer } from './board-access-service'

export interface BoardReadRepository {
  createBoard(name: string, ownerId: number): Promise<BoardRecord>
  findBoardDetails(boardId: number): Promise<BoardDetailsRecord | null>
  findBoardsForUser(userId: number): Promise<readonly BoardRecord[]>
}

export interface BoardMembershipRepository {
  addMember(boardId: number, memberId: number, role: BoardRole): Promise<void>
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

export type BoardDetails = BoardDetailsRecord

/** Coordinates board reads and membership-based actions. */
export class BoardsService {
  /**
   * @param boardReadRepository Persistence port for board reads and creation.
   * @param boardMembershipRepository Persistence port for board memberships.
   * @param userLookupRepository User lookup port.
   * @param boardAccessAuthorizer Shared board authorization policy.
   */
  public constructor(
    private readonly boardReadRepository: BoardReadRepository,
    private readonly boardMembershipRepository: BoardMembershipRepository,
    private readonly userLookupRepository: UserLookupRepository,
    private readonly boardAccessAuthorizer: BoardAccessAuthorizer,
  ) {}

  /** Lists boards the current user belongs to. */
  public async listBoardsForUser(userId: number): Promise<readonly BoardRecord[]> {
    return this.boardReadRepository.findBoardsForUser(userId)
  }

  /** Returns a board with lists, cards, comments, and labels for a member. */
  public async getBoardById(userId: number, boardId: number): Promise<BoardDetailsRecord> {
    await this.boardAccessAuthorizer.assertBoardMember(userId, boardId)

    const board = await this.boardReadRepository.findBoardDetails(boardId)
    if (board === null) {
      throw new NotFoundError('Board not found', { boardId })
    }

    return board
  }

  /** Creates a board and its owner membership. */
  public async createBoard(userId: number, input: CreateBoardInput): Promise<BoardRecord> {
    return this.boardReadRepository.createBoard(input.name, userId)
  }

  /** Adds a new member to a board owned by the current user. */
  public async addMemberToBoard(
    userId: number,
    boardId: number,
    input: AddBoardMemberInput,
  ): Promise<void> {
    await this.boardAccessAuthorizer.assertBoardOwner(userId, boardId)

    const member = await this.userLookupRepository.findById(input.memberId)
    if (member === null) {
      throw new NotFoundError('User not found', { userId: input.memberId })
    }

    const existingRole = await this.boardMembershipRepository.findMemberRole(input.memberId, boardId)
    if (existingRole !== null) {
      throw new ConflictError('User is already a board member', {
        boardId,
        userId: input.memberId,
      })
    }

    await this.boardMembershipRepository.addMember(boardId, input.memberId, 'member')
  }
}
