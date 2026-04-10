import prisma from '../db'
import { Board, BoardMember } from '@prisma/client'

export class BoardRepository {
  async create(name: string): Promise<Board> {
    return prisma.board.create({ data: { name } })
  }

  async findById(id: number) {
    return prisma.board.findUnique({ 
      where: { id },
      include: {
        lists: {
          orderBy: { position: 'asc' },
          include: {
            cards: {
              orderBy: { position: 'asc' },
              include: {
                comments: true,
                labels: {
                  include: {
                    label: true
                  }
                }
              }
            }
          }
        }
      }
    })
  }

  async findMembershipsByUserId(userId: number) {
    return prisma.boardMember.findMany({ 
      where: { userId },
      include: { board: true }
    })
  }

  async addMember(userId: number, boardId: number, role: string = 'member'): Promise<BoardMember> {
    return prisma.boardMember.create({ data: { userId, boardId, role } })
  }

  async checkMembership(userId: number, boardId: number): Promise<boolean> {
    const membership = await prisma.boardMember.findUnique({
      where: { userId_boardId: { userId, boardId } }
    })
    return membership !== null
  }

  async getMemberRole(userId: number, boardId: number): Promise<string | null> {
    const membership = await prisma.boardMember.findUnique({
      where: { userId_boardId: { userId, boardId } }
    })
    return membership?.role || null
  }

  async delete(id: number): Promise<Board> {
    return prisma.board.delete({ where: { id } })
  }
}

export default new BoardRepository()
