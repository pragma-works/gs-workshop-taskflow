import { Router, Request, Response } from 'express'
import prisma from '../db'
import { authMiddleware } from '../middleware/auth'
import { CardRepository, ActivityRepository } from '../repositories'

const router = Router()

// GET /cards/:id
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  const cardId = parseInt(req.params.id)
  const card = await CardRepository.getById(cardId)
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(card)
})

// POST /cards — create card
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const { title, description, listId, assigneeId } = req.body
  const card = await CardRepository.create({ title, description, listId, assigneeId })
  res.status(201).json(card)
})

// PATCH /cards/:id/move — move card to different list (atomically with activity logging)
router.patch('/:id/move', authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId
  const cardId = parseInt(req.params.id)
  const { targetListId, position } = req.body

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { list: true },
  })
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const fromListId = card.listId
  const boardId = card.list.boardId

  // Use transaction to ensure card move and activity logging are atomic
  try {
    await prisma.$transaction(async (tx) => {
      // Move the card
      await tx.card.update({
        where: { id: cardId },
        data: { listId: targetListId, position },
      })

      // Log the activity
      await tx.activityEvent.create({
        data: {
          boardId,
          cardId,
          userId,
          action: 'card_moved',
          meta: JSON.stringify({ fromListId, toListId: targetListId, position }),
        },
      })
    })
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to move card' })
  }
})

// POST /cards/:id/comments — add comment (atomically with activity logging)
router.post('/:id/comments', authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId
  const cardId = parseInt(req.params.id)
  const { content } = req.body

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { list: true },
  })
  if (!card) {
    res.status(404).json({ error: 'Card not found' })
    return
  }

  const boardId = card.list.boardId

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create the comment
      const comment = await tx.comment.create({
        data: { content, cardId, userId },
        include: { user: true },
      })

      // Log the activity
      await tx.activityEvent.create({
        data: {
          boardId,
          cardId,
          userId,
          action: 'comment_added',
          meta: JSON.stringify({ commentId: comment.id }),
        },
      })

      return comment
    })
    res.status(201).json(result)
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' })
  }
})

// DELETE /cards/:id
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  const cardId = parseInt(req.params.id)
  // ANTI-PATTERN: no ownership check — any authenticated user can delete any card
  await prisma.card.delete({ where: { id: cardId } })
  res.json({ ok: true })
})

export default router
