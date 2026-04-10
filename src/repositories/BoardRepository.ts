import prisma from '../db'

export class BoardRepository {
  /**
   * Get all boards for a user with their lists and cards
   */
  static async getUserBoards(userId: number) {
    return prisma.board.findMany({
      where: { members: { some: { userId } } },
      include: { members: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Get board by ID with full hierarchy (lists, cards, comments, labels)
   * Optimized to avoid N+1 queries
   */
  static async getByIdWithHierarchy(boardId: number) {
    return prisma.board.findUnique({
      where: { id: boardId },
      include: {
        members: { include: { user: true } },
        lists: {
          orderBy: { position: 'asc' },
          include: {
            cards: {
              orderBy: { position: 'asc' },
              include: {
                comments: { include: { user: true } },
                labels: { include: { label: true } },
                assignee: true,
              },
            },
          },
        },
      },
    })
  }

  /**
   * Get board by ID (minimal)
   */
  static async getById(boardId: number) {
    return prisma.board.findUnique({
      where: { id: boardId },
    })
  }

  /**
   * Check if user is a member of a board
   */
  static async isMember(userId: number, boardId: number): Promise<boolean> {
    const membership = await prisma.boardMember.findUnique({
      where: { userId_boardId: { userId, boardId } },
    })
    return membership !== null
  }
}
