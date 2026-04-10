import prisma from '../db'
import type { IBoardMemberRepository } from './types'

export class PrismaBoardMemberRepository implements IBoardMemberRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly client: any = prisma) {}

  async isMember(userId: number, boardId: number): Promise<boolean> {
    const record = await this.client.boardMember.findUnique({
      where: { userId_boardId: { userId, boardId } },
    })
    return record !== null
  }

  async addMember(userId: number, boardId: number, role: string): Promise<void> {
    await this.client.boardMember.create({ data: { userId, boardId, role } })
  }
}
