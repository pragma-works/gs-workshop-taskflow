import prisma from '../db'
import type { IBoardMemberRepository } from './types'

export class PrismaBoardMemberRepository implements IBoardMemberRepository {
  async isMember(userId: number, boardId: number): Promise<boolean> {
    const membership = await prisma.boardMember.findUnique({
      where: { userId_boardId: { userId, boardId } },
    })
    return membership !== null
  }
}
