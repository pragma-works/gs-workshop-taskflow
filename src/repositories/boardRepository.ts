import prisma from "../db";

export const boardRepository = {
  async findMembershipsByUser(userId: number) {
    return prisma.boardMember.findMany({ where: { userId } });
  },
  async findById(boardId: number) {
    return prisma.board.findUnique({ where: { id: boardId } });
  },
  async findListsWithCardsAndDetails(boardId: number) {
    // Optimized: fetch lists, cards, comments, and labels in fewer queries
    const lists = await prisma.list.findMany({
      where: { boardId },
      orderBy: { position: "asc" },
      include: {
        cards: {
          orderBy: { position: "asc" },
          include: {
            comments: true,
            cardLabels: { include: { label: true } },
          },
        },
      },
    });
    // Map to expected shape
    return lists.map((list) => ({
      ...list,
      cards: list.cards.map((card) => ({
        ...card,
        labels: card.cardLabels.map((cl) => cl.label),
      })),
    }));
  },
  async createBoard(data: any) {
    return prisma.board.create({ data });
  },
  async addMember(data: any) {
    return prisma.boardMember.create({ data });
  },
  async findMembership(userId: number, boardId: number) {
    return prisma.boardMember.findUnique({
      where: { userId_boardId: { userId, boardId } },
    });
  },
};
