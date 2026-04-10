import prisma from '../db'
import { Card } from '@prisma/client'

export class CardRepository {
  async create(title: string, description: string | undefined, listId: number, assigneeId: number | undefined, position: number): Promise<Card> {
    return prisma.card.create({
      data: { title, description, listId, assigneeId, position }
    })
  }

  async findById(id: number) {
    return prisma.card.findUnique({ 
      where: { id },
      include: {
        comments: true,
        labels: {
          include: {
            label: true
          }
        },
        list: {
          include: {
            board: true
          }
        }
      }
    })
  }

  async count(listId: number): Promise<number> {
    return prisma.card.count({ where: { listId } })
  }

  async delete(id: number): Promise<Card> {
    return prisma.card.delete({ where: { id } })
  }
}

export default new CardRepository()