import { ForbiddenError, NotFoundError } from '../errors'
import type { IBoardMemberRepository, IActivityRepository, PaginationOptions } from '../repositories/types'

const DEFAULT_LIMIT = 50
const MAX_LIMIT     = 100

function parsePagination(
  rawLimit:  unknown,
  rawOffset: unknown,
): PaginationOptions {
  const limit  = Math.min(Number.isFinite(+rawLimit!)  && +rawLimit! > 0  ? +rawLimit!  : DEFAULT_LIMIT, MAX_LIMIT)
  const offset = Number.isFinite(+rawOffset!) && +rawOffset! >= 0 ? +rawOffset! : 0
  return { limit, offset }
}

export class ActivityService {
  constructor(
    private readonly activityRepo:     IActivityRepository,
    private readonly boardMemberRepo:  IBoardMemberRepository,
  ) {}

  async getForBoard(boardId: number, userId: number, rawLimit: unknown, rawOffset: unknown) {
    const isMember = await this.boardMemberRepo.isMember(userId, boardId)
    if (!isMember) throw new ForbiddenError('Not a board member')

    const pagination = parsePagination(rawLimit, rawOffset)
    return this.activityRepo.listForBoard(boardId, pagination)
  }

  async getPreview(boardId: number, rawLimit: unknown, rawOffset: unknown) {
    const pagination = parsePagination(rawLimit, rawOffset)
    return this.activityRepo.listForBoard(boardId, pagination)
  }
}
