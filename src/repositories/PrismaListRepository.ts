import prisma from '../db'
import type { IListRepository, ListRow } from './types'

export class PrismaListRepository implements IListRepository {
  async findById(id: number): Promise<ListRow | null> {
    return prisma.list.findUnique({
      where:  { id },
      select: { id: true, name: true, boardId: true },
    })
  }
}
