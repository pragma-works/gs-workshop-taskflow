import prisma from '../db'

export async function createUser(data: { email: string; password: string; name: string }) {
  return prisma.user.create({ data })
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } })
}

export async function findUserById(id: number) {
  return prisma.user.findUnique({ where: { id } })
}

export async function listBoardsForUser(userId: number) {
  const memberships = await prisma.boardMember.findMany({
    where: { userId },
    include: { board: true },
  })
  return memberships.map((membership) => membership.board)
}

export async function isBoardMember(userId: number, boardId: number): Promise<boolean> {
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
  return membership !== null
}

export async function isBoardOwner(userId: number, boardId: number): Promise<boolean> {
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
  return membership?.role === 'owner'
}

export async function getBoardIdForList(listId: number): Promise<number | null> {
  const list = await prisma.list.findUnique({ where: { id: listId }, select: { boardId: true } })
  return list?.boardId ?? null
}

export async function getBoardIdForCard(cardId: number): Promise<number | null> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { list: { select: { boardId: true } } },
  })
  return card?.list.boardId ?? null
}

export async function getBoardWithDetails(boardId: number) {
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
              labels: { include: { label: true } },
            },
          },
        },
      },
    },
  })

  if (!board) return null

  return {
    ...board,
    lists: board.lists.map((list) => ({
      ...list,
      cards: list.cards.map((card) => ({
        ...card,
        labels: card.labels.map((cardLabel) => cardLabel.label),
      })),
    })),
  }
}

export async function createBoardWithOwner(userId: number, name: string) {
  return prisma.$transaction(async (tx) => {
    const board = await tx.board.create({ data: { name } })
    await tx.boardMember.create({ data: { userId, boardId: board.id, role: 'owner' } })
    return board
  })
}

export async function addBoardMember(boardId: number, memberId: number) {
  return prisma.boardMember.create({ data: { userId: memberId, boardId, role: 'member' } })
}

export async function getCardWithDetails(cardId: number) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      comments: true,
      labels: { include: { label: true } },
    },
  })

  if (!card) return null

  return {
    ...card,
    labels: card.labels.map((cardLabel) => cardLabel.label),
  }
}

export async function createCard(data: {
  title: string
  description?: string
  listId: number
  assigneeId?: number
}) {
  const position = await prisma.card.count({ where: { listId: data.listId } })
  return prisma.card.create({
    data: {
      title: data.title,
      description: data.description,
      listId: data.listId,
      assigneeId: data.assigneeId,
      position,
    },
  })
}

export async function findCardById(cardId: number) {
  return prisma.card.findUnique({ where: { id: cardId } })
}

export async function moveCardWithActivity(data: {
  cardId: number
  actorId: number
  fromListId: number
  targetListId: number
  position: number
}) {
  return prisma.$transaction(async (tx) => {
    await tx.card.update({
      where: { id: data.cardId },
      data: { listId: data.targetListId, position: data.position },
    })

    const targetList = await tx.list.findUnique({ where: { id: data.targetListId } })
    if (!targetList) {
      throw new Error('Target list not found')
    }

    return tx.activityEvent.create({
      data: {
        eventType: 'card_moved',
        cardId: data.cardId,
        fromListId: data.fromListId,
        toListId: data.targetListId,
        actorId: data.actorId,
        boardId: targetList.boardId,
      },
    })
  })
}

export async function createCommentWithActivity(data: {
  content: string
  cardId: number
  userId: number
}) {
  return prisma.$transaction(async (tx) => {
    const card = await tx.card.findUnique({
      where: { id: data.cardId },
      select: { list: { select: { boardId: true } } },
    })

    if (!card) {
      throw new Error('Card not found')
    }

    const comment = await tx.comment.create({ data })
    await tx.activityEvent.create({
      data: {
        eventType: 'comment_created',
        cardId: data.cardId,
        actorId: data.userId,
        boardId: card.list.boardId,
      },
    })

    return comment
  })
}

export async function deleteCard(cardId: number) {
  return prisma.card.delete({ where: { id: cardId } })
}

export async function getActivityEvents(boardId: number) {
  const events = await prisma.activityEvent.findMany({
    where: { boardId },
    orderBy: { createdAt: 'desc' },
    include: {
      actor: true,
      card: true,
      fromList: true,
      toList: true,
    },
  })

  return events.map(({ actor, card, fromList, toList, ...event }) => ({
    ...event,
    actorName: actor.name,
    cardTitle: card?.title ?? null,
    fromListName: fromList?.name ?? null,
    toListName: toList?.name ?? null,
  }))
}
