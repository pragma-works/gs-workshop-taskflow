import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../db'
import { verifyToken } from '../lib/auth'

const router = Router()

const CreateCardSchema = z.object({
  title:       z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  listId:      z.number().int().positive(),
  assigneeId:  z.number().int().positive().optional(),
})

const MoveCardSchema = z.object({
  targetListId: z.number().int().positive(),
  position:     z.number().int().min(0),
})

const CommentSchema = z.object({ content: z.string().min(1).max(5000) })

async function getMembershipForCard(userId: number, cardId: number) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { list: true },
  })
  if (!card) return { card: null, membership: null }
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId: card.list.boardId } },
  })
  return { card, membership }
}

// GET /cards/:id
router.get('/:id', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const cardId = parseInt(req.params.id)
  if (isNaN(cardId)) {
    res.status(400).json({ error: 'Invalid card id' })
    return
  }

  const { card, membership } = await getMembershipForCard(userId, cardId)
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  if (!membership) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  const fullCard = await prisma.card.findUnique({
    where: { id: cardId },
    include: { comments: true, labels: { include: { label: true } } },
  })
  res.json(fullCard)
})

// POST /cards — create card
router.post('/', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const parsed = CreateCardSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors })
    return
  }
  const { title, description, listId, assigneeId } = parsed.data

  // Verify user is a member of the board owning this list
  const list = await prisma.list.findUnique({ where: { id: listId } })
  if (!list) {
    res.status(404).json({ error: 'List not found' })
    return
  }
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId: list.boardId } },
  })
  if (!membership) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  // Wrap count + create in a transaction to prevent position collisions under concurrency
  const card = await prisma.$transaction(async (tx) => {
    const count = await tx.card.count({ where: { listId } })
    return tx.card.create({
      data: { title, description, listId, assigneeId, position: count },
    })
  })
  res.status(201).json(card)
})

// PATCH /cards/:id/move — move card to different list
router.patch('/:id/move', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const cardId = parseInt(req.params.id)
  if (isNaN(cardId)) {
    res.status(400).json({ error: 'Invalid card id' })
    return
  }

  const parsed = MoveCardSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors })
    return
  }
  const { targetListId, position } = parsed.data

  const card = await prisma.card.findUnique({ where: { id: cardId }, include: { list: true } })
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const targetList = await prisma.list.findUnique({ where: { id: targetListId } })
  if (!targetList) {
    res.status(404).json({ error: 'Target list not found' })
    return
  }

  const fromListId = card.listId
  const boardId = card.list.boardId

  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
  if (!membership) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  try {
    const [, event] = await prisma.$transaction([
      prisma.card.update({ where: { id: cardId }, data: { listId: targetListId, position } }),
      prisma.activityEvent.create({
        data: {
          eventType:  'card_moved',
          cardId,
          fromListId,
          toListId:   targetListId,
          actorId:    userId,
          boardId,
        },
      }),
    ])
    res.json({ ok: true, event })
  } catch (err) {
    res.status(500).json({ error: 'Move failed' })
  }
})

// POST /cards/:id/comments — add comment
router.post('/:id/comments', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const cardId = parseInt(req.params.id)
  if (isNaN(cardId)) {
    res.status(400).json({ error: 'Invalid card id' })
    return
  }

  const parsed = CommentSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors })
    return
  }

  const { card, membership } = await getMembershipForCard(userId, cardId)
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  if (!membership) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  const comment = await prisma.comment.create({ data: { content: parsed.data.content, cardId, userId } })
  res.status(201).json(comment)
})

// DELETE /cards/:id
router.delete('/:id', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const cardId = parseInt(req.params.id)
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { list: true },
  })
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId: card.list.boardId } },
  })
  if (!membership) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  await prisma.card.delete({ where: { id: cardId } })
  res.json({ ok: true })
})

export default router

