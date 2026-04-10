import prisma from '../db'
import { Comment } from '@prisma/client'

export class CommentRepository {
  async create(content: string, cardId: number, userId: number): Promise<Comment> {
    return prisma.comment.create({ data: { content, cardId, userId } })
  }
}

export default new CommentRepository()