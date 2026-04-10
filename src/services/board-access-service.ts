import type { BoardRecord, BoardRole } from '../domain/models'
import { ForbiddenError, NotFoundError } from '../errors/application-error'

export interface BoardAccessRepository {
  findBoardById(boardId: number): Promise<BoardRecord | null>
  findMemberRole(userId: number, boardId: number): Promise<BoardRole | null>
}

export interface BoardAccessAuthorizer {
  assertBoardExists(boardId: number): Promise<void>
  assertBoardMember(userId: number, boardId: number): Promise<void>
  assertBoardOwner(userId: number, boardId: number): Promise<void>
}

/** Centralizes board existence and membership checks for services. */
export class BoardAccessService implements BoardAccessAuthorizer {
  /** @param boardAccessRepository Persistence port for board membership and existence checks. */
  public constructor(private readonly boardAccessRepository: BoardAccessRepository) {}

  /** Verifies that a board exists before downstream work continues. */
  public async assertBoardExists(boardId: number): Promise<void> {
    const board = await this.boardAccessRepository.findBoardById(boardId)
    if (board === null) {
      throw new NotFoundError('Board not found', { boardId })
    }
  }

  /** Verifies that a user belongs to the target board. */
  public async assertBoardMember(userId: number, boardId: number): Promise<void> {
    const role = await this.findMemberRoleForExistingBoard(userId, boardId)
    if (role === null) {
      throw new ForbiddenError('Not a board member', { boardId, userId })
    }
  }

  /** Verifies that a user owns the target board. */
  public async assertBoardOwner(userId: number, boardId: number): Promise<void> {
    const role = await this.findMemberRoleForExistingBoard(userId, boardId)
    if (role !== 'owner') {
      throw new ForbiddenError('Only board owners can manage members', { boardId, userId })
    }
  }

  private async findMemberRoleForExistingBoard(
    userId: number,
    boardId: number,
  ): Promise<BoardRole | null> {
    await this.assertBoardExists(boardId)
    return this.boardAccessRepository.findMemberRole(userId, boardId)
  }
}
