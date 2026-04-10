import prisma from '../db'
import type { ICommentRepository, CreateCommentInput, CommentRow } from './types'

export class PrismaCommentRepository implements ICommentRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly client: any = prisma) {}

  async create(data: CreateCommentInput): Promise<CommentRow> {
    return this.client.comment.create({ data }) as Promise<CommentRow>
  }
}
