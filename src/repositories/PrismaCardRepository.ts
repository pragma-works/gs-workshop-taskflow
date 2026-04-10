import type { PrismaClient } from '@prisma/client'
import prisma from '../db'
import type {
  ICardRepository,
  CardRow,
  CreatedCardRow,
  CreateCardInput,
  UpdateCardInput,
} from './types'

export class PrismaCardRepository implements ICardRepository {
  // `client` accepts either the top-level PrismaClient or a Prisma transaction
  // client so that this repository can participate in a UnitOfWork transaction.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly client: any = prisma) {}

  async findById(id: number): Promise<CardRow | null> {
    return this.client.card.findUnique({
      where:  { id },
      select: {
        id:       true,
        title:    true,
        listId:   true,
        position: true,
        list:     { select: { id: true, name: true, boardId: true } },
      },
    }) as Promise<CardRow | null>
  }

  async countInList(listId: number): Promise<number> {
    return this.client.card.count({ where: { listId } })
  }

  async create(data: CreateCardInput): Promise<CreatedCardRow> {
    return this.client.card.create({ data }) as Promise<CreatedCardRow>
  }

  async update(id: number, data: UpdateCardInput): Promise<void> {
    await this.client.card.update({ where: { id }, data })
  }
}
