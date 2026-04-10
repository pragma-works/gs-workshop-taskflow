import prisma from "../db";

export const cardRepository = {
  async findById(cardId: number) {
    return prisma.card.findUnique({ where: { id: cardId } });
  },
  async findComments(cardId: number) {
    return prisma.comment.findMany({ where: { cardId } });
  },
  async findLabels(cardId: number) {
    const cardLabels = await prisma.cardLabel.findMany({ where: { cardId } });
    const labels = [];
    for (const cl of cardLabels) {
      const label = await prisma.label.findUnique({
        where: { id: cl.labelId },
      });
      labels.push(label);
    }
    return labels;
  },
  async countInList(listId: number) {
    return prisma.card.count({ where: { listId } });
  },
  async createCard(data: any) {
    return prisma.card.create({ data });
  },
  async updateCard(cardId: number, data: any) {
    return prisma.card.update({ where: { id: cardId }, data });
  },
  async deleteCard(cardId: number) {
    return prisma.card.delete({ where: { id: cardId } });
  },
};
