import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// ─── User Repository ─────────────────────────────────────────────────────────

export async function createUser(data: { email: string; password: string; name: string }) {
  return db.user.create({ data })
}

export async function findUserByEmail(email: string) {
  return db.user.findUnique({ where: { email } })
}

export async function findUserById(id: number) {
  return db.user.findUnique({ where: { id } })
}

// ─── Board Repository ────────────────────────────────────────────────────────

export async function findMembership(userId: number, boardId: number) {
  return db.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
}

export async function findMembershipsByUser(userId: number) {
  return db.boardMember.findMany({ where: { userId } })
}

export async function findBoardById(id: number) {
  return db.board.findUnique({ where: { id } })
}

export async function createBoard(name: string) {
  return db.board.create({ data: { name } })
}

export async function addBoardMember(userId: number, boardId: number, role: string) {
  return db.boardMember.create({ data: { userId, boardId, role } })
}

export async function findListsByBoard(boardId: number) {
  return db.list.findMany({ where: { boardId }, orderBy: { position: 'asc' } })
}

export async function findCardsByList(listId: number) {
  return db.card.findMany({ where: { listId }, orderBy: { position: 'asc' } })
}

export async function findCommentsByCard(cardId: number) {
  return db.comment.findMany({ where: { cardId } })
}

export async function findCardLabelsByCard(cardId: number) {
  return db.cardLabel.findMany({ where: { cardId } })
}

export async function findLabelById(id: number) {
  return db.label.findUnique({ where: { id } })
}

// ─── Card Repository ─────────────────────────────────────────────────────────

export async function findCardById(id: number) {
  return db.card.findUnique({ where: { id } })
}

export async function countCardsByList(listId: number) {
  return db.card.count({ where: { listId } })
}

export async function createCard(data: { title: string; description?: string; listId: number; assigneeId?: number; position: number }) {
  return db.card.create({ data })
}

export async function findListById(id: number) {
  return db.list.findUnique({ where: { id } })
}

export async function moveCardWithActivity(
  cardId: number,
  targetListId: number,
  position: number,
  actorId: number,
  boardId: number,
  fromListId: number
) {
  return db.$transaction(async (tx) => {
    const updatedCard = await tx.card.update({
      where: { id: cardId },
      data: { listId: targetListId, position },
    })

    const event = await tx.activityEvent.create({
      data: {
        boardId,
        actorId,
        eventType: 'card_moved',
        cardId,
        fromListId,
        toListId: targetListId,
      },
    })

    return event
  })
}

export async function createComment(data: { content: string; cardId: number; userId: number }) {
  return db.comment.create({ data })
}

export async function deleteCard(id: number) {
  return db.card.delete({ where: { id } })
}

// ─── Activity Repository ─────────────────────────────────────────────────────

export async function findActivityEventsForBoard(boardId: number) {
  const events = await db.activityEvent.findMany({
    where: { boardId },
    include: {
      actor: { select: { id: true, name: true } },
      card: { select: { id: true, title: true } },
      fromList: { select: { id: true, name: true } },
      toList: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return events.map((event) => ({
    id: event.id,
    boardId: event.boardId,
    actorId: event.actorId,
    actorName: event.actor.name,
    eventType: event.eventType,
    cardId: event.cardId,
    cardTitle: event.card?.title ?? null,
    fromListId: event.fromListId,
    fromListName: event.fromList?.name ?? null,
    toListId: event.toListId,
    toListName: event.toList?.name ?? null,
    createdAt: event.createdAt,
  }))
}

export default db
