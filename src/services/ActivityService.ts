import { IBoardRepository } from '../repositories/IBoardRepository'
import { IActivityRepository } from '../repositories/IActivityRepository'

export class ActivityService {
  constructor(
    private readonly boards: IBoardRepository,
    private readonly activity: IActivityRepository,
  ) {}

  async getFeedAuthenticated(userId: number, boardId: number) {
    const member = await this.boards.getMembership(userId, boardId)
    if (!member) throw Object.assign(new Error('Not a board member'), { status: 403 })
    return this.activity.findByBoard(boardId)
  }

  getFeedPreview(boardId: number) {
    return this.activity.findByBoard(boardId)
  }
}
