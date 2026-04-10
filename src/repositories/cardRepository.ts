import { Prisma } from '@prisma/client'
import prisma from '../db'

export class CardRepository {
  async findById(cardId: number) {
    return prisma.card.findUnique({ where: { id: cardId } })
  }

  async findByIdWithBoard(cardId: number) {
    return prisma.card.findUnique({
      where: { id: cardId },
      include: { list: { select: { boardId: true } } },
    })
  }

  async findByIdDetailed(cardId: number) {
    return prisma.card.findUnique({
      where: { id: cardId },
      include: {
        comments: true,
        labels: {
          include: {
            label: true,
          },
        },
      },
    })
  }

  async countInList(listId: number) {
    return prisma.card.count({ where: { listId } })
  }

  async findListBoardInfo(listId: number) {
    return prisma.list.findUnique({
      where: { id: listId },
      select: { boardId: true },
    })
  }

  async create(data: { title: string; description?: string; listId: number; assigneeId?: number | null; position: number }) {
    return prisma.card.create({
      data: {
        title: data.title,
        description: data.description,
        listId: data.listId,
        assigneeId: data.assigneeId ?? null,
        position: data.position,
      },
    })
  }

  async createComment(cardId: number, userId: number, content: string) {
    return prisma.comment.create({ data: { cardId, userId, content } })
  }

  async delete(cardId: number) {
    return prisma.card.delete({ where: { id: cardId } })
  }

  async findListById(listId: number, tx: Prisma.TransactionClient) {
    return tx.list.findUnique({ where: { id: listId } })
  }

  async move(cardId: number, targetListId: number, position: number, tx: Prisma.TransactionClient) {
    return tx.card.update({ where: { id: cardId }, data: { listId: targetListId, position } })
  }

  async runInTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
    return prisma.$transaction((tx) => callback(tx))
  }
}
