import { Prisma } from '@prisma/client'
import prisma from '../db'

export class ActivityRepository {
  async createMoveEvent(
    data: {
      boardId: number
      actorId: number
      cardId: number
      fromListId: number
      toListId: number
    },
    tx: Prisma.TransactionClient,
  ) {
    return tx.activityEvent.create({
      data: {
        boardId: data.boardId,
        actorId: data.actorId,
        eventType: 'card_moved',
        cardId: data.cardId,
        fromListId: data.fromListId,
        toListId: data.toListId,
      },
    })
  }

  async findByBoard(boardId: number) {
    return prisma.activityEvent.findMany({
      where: { boardId },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { name: true } },
        card: { select: { title: true } },
        fromList: { select: { name: true } },
        toList: { select: { name: true } },
      },
    })
  }
}
