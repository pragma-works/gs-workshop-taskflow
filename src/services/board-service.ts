import prisma from '../db'
import { ForbiddenError, NotFoundError } from '../errors'

export async function assertBoardMember(userId: number, boardId: number): Promise<void> {
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })

  if (!membership) {
    throw new ForbiddenError('Not a board member')
  }
}

export async function assertBoardOwner(userId: number, boardId: number): Promise<void> {
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })

  if (!membership || membership.role !== 'owner') {
    throw new ForbiddenError('Only board owners can add members')
  }
}

export async function listBoardsForUser(userId: number) {
  const memberships = await prisma.boardMember.findMany({
    where: { userId },
    include: { board: true },
  })

  return memberships.map((membership) => membership.board)
}

export async function getBoardDetailsForUser(userId: number, boardId: number) {
  await assertBoardMember(userId, boardId)

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      lists: {
        orderBy: { position: 'asc' },
        include: {
          cards: {
            orderBy: { position: 'asc' },
            include: {
              comments: true,
              labels: {
                include: { label: true },
              },
            },
          },
        },
      },
    },
  })

  if (!board) {
    throw new NotFoundError('Board not found')
  }

  return {
    id: board.id,
    name: board.name,
    createdAt: board.createdAt,
    lists: board.lists.map((list) => ({
      id: list.id,
      name: list.name,
      position: list.position,
      boardId: list.boardId,
      cards: list.cards.map((card) => ({
        id: card.id,
        title: card.title,
        description: card.description,
        position: card.position,
        dueDate: card.dueDate,
        listId: card.listId,
        assigneeId: card.assigneeId,
        createdAt: card.createdAt,
        comments: card.comments,
        labels: card.labels.map((cardLabel) => cardLabel.label),
      })),
    })),
  }
}

export async function createBoardForUser(userId: number, name: string) {
  return prisma.$transaction(async (tx) => {
    const board = await tx.board.create({ data: { name } })
    await tx.boardMember.create({ data: { userId, boardId: board.id, role: 'owner' } })
    return board
  })
}

export async function addMemberToBoard(ownerId: number, boardId: number, memberId: number) {
  await assertBoardOwner(ownerId, boardId)
  await prisma.boardMember.create({ data: { userId: memberId, boardId, role: 'member' } })
}