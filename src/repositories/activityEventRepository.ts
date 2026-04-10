import prisma from "../db";

export const activityEventRepository = {
  async findByBoard(boardId: number) {
    return prisma.activityEvent.findMany({
      where: { boardId },
      orderBy: { createdAt: "desc" },
    });
  },
  async findPreviewByBoard(boardId: number, limit = 10) {
    return prisma.activityEvent.findMany({
      where: { boardId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },
  async create(event: {
    boardId: number;
    cardId?: number;
    userId: number;
    action: string;
    meta?: any;
  }) {
    return prisma.activityEvent.create({ data: event });
  },
};
