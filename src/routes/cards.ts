import { Prisma } from '@prisma/client'
import { Router } from 'express'
import { getUserId, requireAuth } from '../auth'
import prisma from '../db'
import { createActivityEvent } from '../activity-log'
import { AppError, asyncHandler } from '../errors'
import { getCardContext, getListContext, requireBoardMember, requireBoardOwnerOrAssignee } from '../permissions'
import { publicUserSelect } from '../serializers'
import { nonNegativeInteger, optionalPositiveInt, optionalString, parsePositiveInt, requireString } from '../validation'

const router = Router()
router.use(requireAuth)

type TransactionClient = Prisma.TransactionClient

async function reorderList(tx: TransactionClient, listId: number, orderedCardIds: number[]): Promise<void> {
  await Promise.all(orderedCardIds.map((id, index) => tx.card.update({
    where: { id },
    data: { listId, position: index },
  })))
}

// GET /cards/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const userId = getUserId(req)
  const cardId = parsePositiveInt(req.params.id, 'card id')
  const cardContext = await getCardContext(cardId)
  await requireBoardMember(userId, cardContext.list.boardId)

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      assignee: { select: publicUserSelect },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { user: { select: publicUserSelect } },
      },
      labels: {
        include: { label: true },
      },
    },
  })

  if (!card) {
    throw new AppError(404, 'Card not found')
  }

  const labels = []
  for (const labelLink of card.labels) {
    labels.push(labelLink.label)
  }

  res.json({
    ...card,
    labels,
  })
}))

// POST /cards — create card
router.post('/', asyncHandler(async (req, res) => {
  const userId = getUserId(req)
  const title = requireString(req.body.title, 'title', { minLength: 1, maxLength: 200 })
  const description = optionalString(req.body.description, 'description', { maxLength: 5000 })
  const listId = parsePositiveInt(req.body.listId, 'list id')
  const assigneeId = optionalPositiveInt(req.body.assigneeId, 'assignee id')
  const list = await getListContext(listId)

  await requireBoardMember(userId, list.boardId)

  if (assigneeId !== null) {
    const assignee = await prisma.boardMember.findUnique({
      where: { userId_boardId: { userId: assigneeId, boardId: list.boardId } },
      include: { user: { select: { name: true } } },
    })
    if (!assignee) {
      throw new AppError(400, 'Assignee must be a board member')
    }
  }

  const createdCard = await prisma.$transaction(async (tx: TransactionClient) => {
    const currentUser = await tx.user.findUnique({ where: { id: userId }, select: { name: true } })
    if (!currentUser) {
      throw new AppError(404, 'User not found')
    }

    const position = await tx.card.count({ where: { listId } })
    const card = await tx.card.create({
      data: { title, description, listId, assigneeId, position },
    })

    await createActivityEvent(tx, {
      boardId: list.boardId,
      actorId: userId,
      actorName: currentUser.name,
      eventType: 'card_created',
      cardId: card.id,
      cardTitle: card.title,
      toListName: list.name,
    })

    return card
  })

  res.status(201).json(createdCard)
}))

// PATCH /cards/:id/move — move card to different list
router.patch('/:id/move', asyncHandler(async (req, res) => {
  const userId = getUserId(req)
  const cardId = parsePositiveInt(req.params.id, 'card id')
  const targetListId = parsePositiveInt(req.body.targetListId, 'target list id')
  const requestedPosition = nonNegativeInteger(req.body.position, 'position')
  const card = await getCardContext(cardId)
  const targetList = await getListContext(targetListId)

  await requireBoardMember(userId, card.list.boardId)
  if (card.list.boardId !== targetList.boardId) {
    throw new AppError(400, 'Target list must belong to the same board')
  }

  const updatedCard = await prisma.$transaction(async (tx: TransactionClient) => {
    const actor = await tx.user.findUnique({ where: { id: userId }, select: { name: true } })
    if (!actor) {
      throw new AppError(404, 'User not found')
    }

    const sourceCards = await tx.card.findMany({
      where: { listId: card.listId, NOT: { id: cardId } },
      orderBy: { position: 'asc' },
      select: { id: true },
    })
    const sourceCardIds = []
    for (const item of sourceCards) {
      sourceCardIds.push(item.id)
    }

    const targetCards = await tx.card.findMany({
      where: targetListId === card.listId ? { listId: targetListId, NOT: { id: cardId } } : { listId: targetListId },
      orderBy: { position: 'asc' },
      select: { id: true },
    })
    const targetCardIds = []
    for (const item of targetCards) {
      targetCardIds.push(item.id)
    }

    const boundedPosition = Math.min(requestedPosition, targetCardIds.length)
    targetCardIds.splice(boundedPosition, 0, cardId)

    if (targetListId === card.listId) {
      await reorderList(tx, card.listId, targetCardIds)
    } else {
      await reorderList(tx, card.listId, sourceCardIds)
      await reorderList(tx, targetListId, targetCardIds)
    }

    await createActivityEvent(tx, {
      boardId: card.list.boardId,
      actorId: userId,
      actorName: actor.name,
      eventType: 'card_moved',
      cardId,
      cardTitle: card.title,
      fromListName: card.list.name,
      toListName: targetList.name,
    })

    const movedCard = await tx.card.findUnique({ where: { id: cardId } })
    if (!movedCard) {
      throw new AppError(404, 'Card not found')
    }

    return movedCard
  })

  res.json(updatedCard)
}))

// POST /cards/:id/comments — add comment
router.post('/:id/comments', asyncHandler(async (req, res) => {
  const userId = getUserId(req)
  const cardId = parsePositiveInt(req.params.id, 'card id')
  const content = requireString(req.body.content, 'content', { minLength: 1, maxLength: 5000 })
  const card = await getCardContext(cardId)
  await requireBoardMember(userId, card.list.boardId)

  const comment = await prisma.$transaction(async (tx: TransactionClient) => {
    const actor = await tx.user.findUnique({ where: { id: userId }, select: { name: true } })
    if (!actor) {
      throw new AppError(404, 'User not found')
    }

    const createdComment = await tx.comment.create({ data: { content, cardId, userId } })
    await createActivityEvent(tx, {
      boardId: card.list.boardId,
      actorId: userId,
      actorName: actor.name,
      eventType: 'card_commented',
      cardId,
      cardTitle: card.title,
      toListName: card.list.name,
      commentPreview: content.slice(0, 120),
    })

    return createdComment
  })

  res.status(201).json(comment)
}))

// DELETE /cards/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const userId = getUserId(req)
  const cardId = parsePositiveInt(req.params.id, 'card id')
  const card = await getCardContext(cardId)
  await requireBoardOwnerOrAssignee(userId, card)

  await prisma.$transaction(async (tx: TransactionClient) => {
    await tx.card.delete({ where: { id: cardId } })

    const remainingCards = await tx.card.findMany({
      where: { listId: card.listId },
      orderBy: { position: 'asc' },
      select: { id: true },
    })
    const remainingCardIds = []
    for (const item of remainingCards) {
      remainingCardIds.push(item.id)
    }

    await reorderList(tx, card.listId, remainingCardIds)
  })

  res.json({ ok: true })
}))

export default router
