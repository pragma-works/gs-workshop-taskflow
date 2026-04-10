import prisma from '../db'

/**
 * Repository for board persistence operations
 */
export class BoardRepository {
  /**
   * Find boards for a user
   * @param userId User ID
   * @returns Array of boards
   */
  async findByUserId(userId: number) {
    const memberships = await prisma.boardMember.findMany({
      where: { userId },
      include: { board: true },
    })
    return memberships.map((m) => m.board)
  }

  /**
   * Find a board by ID
   * @param boardId Board ID
   * @returns Board or null
   */
  async findById(boardId: number) {
    return await prisma.board.findUnique({ where: { id: boardId } })
  }

  /**
   * Find full board with lists, cards, comments, labels
   * @param boardId Board ID
   * @returns Board with nested data
   */
  async findByIdWithDetails(boardId: number) {
    const board = await prisma.board.findUnique({ where: { id: boardId } })
    if (!board) return null

    const lists = await prisma.list.findMany({
      where: { boardId },
      orderBy: { position: 'asc' },
      include: {
        cards: {
          orderBy: { position: 'asc' },
          include: {
            comments: true,
            labels: {
              include: { label: true },
            },
          },
        },
      },
    })

    const formattedLists = lists.map((list) => ({
      ...list,
      cards: list.cards.map((card) => ({
        ...card,
        labels: card.labels.map((cl) => cl.label),
      })),
    }))

    return { ...board, lists: formattedLists }
  }

  /**
   * Check if user is a member of a board
   * @param userId User ID
   * @param boardId Board ID
   * @returns true if member, false otherwise
   */
  async isMember(userId: number, boardId: number): Promise<boolean> {
    const membership = await prisma.boardMember.findUnique({
      where: { userId_boardId: { userId, boardId } },
    })
    return membership !== null
  }

  /**
   * Create a new board
   * @param name Board name
   * @param ownerId User ID of the owner
   * @returns Created board
   */
  async create(name: string, ownerId: number) {
    return await prisma.board.create({
      data: {
        name,
        members: {
          create: { userId: ownerId, role: 'owner' },
        },
      },
    })
  }

  /**
   * Add a member to a board
   * @param userId User ID
   * @param boardId Board ID
   */
  async addMember(userId: number, boardId: number) {
    return await prisma.boardMember.create({
      data: { userId, boardId, role: 'member' },
    })
  }
}
