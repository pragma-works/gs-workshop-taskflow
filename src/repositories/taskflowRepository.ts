import prisma from '../db'

function mapCard(card: Awaited<ReturnType<typeof prisma.card.findUniqueOrThrow>> & {
  comments: Awaited<ReturnType<typeof prisma.comment.findMany>>
  labels: Array<{ label: Awaited<ReturnType<typeof prisma.label.findUniqueOrThrow>> }>
}) {
  return {
    ...card,
    labels: card.labels.map(({ label }) => label),
  }
}

export async function createUser(data: { email: string; password: string; name: string }) {
  return prisma.user.create({ data })
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } })
}

export async function findUserById(id: number) {
  return prisma.user.findUnique({ where: { id } })
}

export async function findBoardMembership(userId: number, boardId: number) {
  return prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
}

export async function isBoardMember(userId: number, boardId: number): Promise<boolean> {
  return (await findBoardMembership(userId, boardId)) !== null
}

export async function isBoardOwner(userId: number, boardId: number): Promise<boolean> {
  const membership = await findBoardMembership(userId, boardId)
  return membership?.role === 'owner'
}

export async function listBoardsForUser(userId: number) {
  return prisma.board.findMany({
    where: { members: { some: { userId } } },
    orderBy: { createdAt: 'asc' },
  })
}

export async function findBoardWithDetails(boardId: number) {
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
                include: {
                  label: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!board) {
    return null
  }

  return {
    ...board,
    lists: board.lists.map((list) => ({
      ...list,
      cards: list.cards.map((card) => mapCard(card)),
    })),
  }
}

export async function createBoardWithOwner(name: string, userId: number) {
  return prisma.$transaction(async (tx) => {
    const board = await tx.board.create({ data: { name } })
    await tx.boardMember.create({
      data: { userId, boardId: board.id, role: 'owner' },
    })
    return board
  })
}

export async function addBoardMember(boardId: number, memberId: number) {
  return prisma.boardMember.create({
    data: { userId: memberId, boardId, role: 'member' },
  })
}

export async function findCardWithDetails(cardId: number) {
  const card = await prisma.card.findUnique({
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

  if (!card) {
    return null
  }

  return mapCard(card)
}

export async function createCardAtEnd(data: {
  title: string
  description?: string | null
  listId: number
  assigneeId?: number | null
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

export async function findCardForMove(cardId: number) {
  return prisma.card.findUnique({
    where: { id: cardId },
    include: {
      list: {
        select: {
          boardId: true,
        },
      },
    },
  })
}

export async function findListById(listId: number) {
  return prisma.list.findUnique({
    where: { id: listId },
    select: {
      id: true,
      boardId: true,
      name: true,
    },
  })
}

export async function moveCardWithActivity(params: {
  cardId: number
  boardId: number
  actorId: number
  fromListId: number
  targetListId: number
  position: number
}) {
  return prisma.$transaction(async (tx) => {
    await tx.card.update({
      where: { id: params.cardId },
      data: {
        listId: params.targetListId,
        position: params.position,
      },
    })

    return tx.activityEvent.create({
      data: {
        boardId: params.boardId,
        actorId: params.actorId,
        eventType: 'card_moved',
        cardId: params.cardId,
        fromListId: params.fromListId,
        toListId: params.targetListId,
      },
    })
  })
}

export async function createComment(data: { content: string; cardId: number; userId: number }) {
  return prisma.comment.create({ data })
}

export async function deleteCardById(cardId: number) {
  return prisma.card.delete({ where: { id: cardId } })
}

export async function listBoardActivity(boardId: number) {
  const events = await prisma.activityEvent.findMany({
    where: { boardId },
    orderBy: { createdAt: 'desc' },
    include: {
      actor: { select: { name: true } },
      card: { select: { title: true } },
      fromList: { select: { name: true } },
      toList: { select: { name: true } },
    },
  })

  return events.map(({ actor, card, fromList, toList, ...event }) => ({
    ...event,
    actorName: actor.name,
    cardTitle: card?.title ?? null,
    fromListName: fromList?.name ?? null,
    toListName: toList?.name ?? null,
    timestamp: event.createdAt,
  }))
}
