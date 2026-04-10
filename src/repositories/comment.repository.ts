import prisma from '../db'

export async function createComment(data: { content: string; cardId: number; userId: number }) {
  return prisma.comment.create({ data })
}
