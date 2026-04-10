import { ForbiddenError } from '../errors'
import type {
  IActivityRepository,
  IBoardMemberRepository,
  ActivityEventDto,
} from '../repositories/types'

export class ActivityService {
  constructor(
    private readonly activityRepo:    IActivityRepository,
    private readonly boardMemberRepo: IBoardMemberRepository,
  ) {}

  /** Returns activity events for a board. Throws ForbiddenError if userId is not a member. */
  async getForBoard(boardId: number, userId: number): Promise<ActivityEventDto[]> {
    const member = await this.boardMemberRepo.isMember(userId, boardId)
    if (!member) throw new ForbiddenError('Not a board member')
    return this.activityRepo.listForBoard(boardId)
  }

  /** Returns activity events without auth — used by the public preview endpoint. */
  async getPreview(boardId: number): Promise<ActivityEventDto[]> {
    return this.activityRepo.listForBoard(boardId)
  }
}
