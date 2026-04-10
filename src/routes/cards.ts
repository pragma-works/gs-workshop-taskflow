import { Router, Request, Response } from 'express'
import prisma from '../db'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.use(requireAuth)

// GET /cards/:id
router.get('/:id', async (req: Request, res: Response) => {
  const cardId = parseInt(req.params.id)
  if (Number.isNaN(cardId)) {
    res.status(400).json({ error: 'Invalid card id' })
    return
  }

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      comments: true,
      labels: { include: { label: true } },
    },
  })
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  res.json({
    ...card,
    labels: card.labels.map((cardLabel) => cardLabel.label),
  })
})

// POST /cards — create card
router.post('/', async (req: Request, res: Response) => {
  const { title, description, listId, assigneeId } = req.body
  // ANTI-PATTERN: position not calculated — just appended with no ordering logic
  const count = await prisma.card.count({ where: { listId } })
  const card = await prisma.card.create({
    data: { title, description, listId, assigneeId, position: count },
  })
  res.status(201).json(card)
})

// PATCH /cards/:id/move — move card to different list
router.patch('/:id/move', async (req: Request, res: Response) => {
  const userId = req.userId as number

  const cardId = parseInt(req.params.id)
  if (Number.isNaN(cardId)) {
    res.status(400).json({ error: 'Invalid card id' })
    return
  }

  const { targetListId, position }: { targetListId: number; position: number } = req.body

  try {
    const event = await prisma.$transaction(async (tx) => {
      const card = await tx.card.findUnique({ where: { id: cardId } })
      if (!card) {
        throw new Error('Card not found')
      }

      const targetList = await tx.list.findUnique({ where: { id: targetListId } })
      if (!targetList) {
        throw new Error('Target list not found')
      }

      await tx.card.update({
        where: { id: cardId },
        data: { listId: targetListId, position },
      })

      return tx.activityEvent.create({
        data: {
          eventType: 'card_moved',
          cardId,
          fromListId: card.listId,
          toListId: targetListId,
          actorId: userId,
          boardId: targetList.boardId,
        },
      })
    })

    res.json({ ok: true, event })
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error)
    res.status(500).json({ error: 'Move failed', details })
  }
})

// POST /cards/:id/comments — add comment
router.post('/:id/comments', async (req: Request, res: Response) => {
  const userId = req.userId as number

  const { content } = req.body
  const cardId = parseInt(req.params.id)
  if (Number.isNaN(cardId)) {
    res.status(400).json({ error: 'Invalid card id' })
    return
  }

  const comment = await prisma.comment.create({ data: { content, cardId, userId } })
  res.status(201).json(comment)
})

// DELETE /cards/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const cardId = parseInt(req.params.id)
  if (Number.isNaN(cardId)) {
    res.status(400).json({ error: 'Invalid card id' })
    return
  }

  // ANTI-PATTERN: no ownership check — any authenticated user can delete any card
  await prisma.card.delete({ where: { id: cardId } })
  res.json({ ok: true })
})

export default router
