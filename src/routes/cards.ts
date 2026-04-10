import { Router, Request, Response } from 'express'
import * as jwt from 'jsonwebtoken'
import prisma from '../db'

const router = Router()

// ANTI-PATTERN: auth helper copy-pasted identically from users.ts and boards.ts
function verifyToken(req: Request): number {
  const header = req.headers.authorization
  if (!header) throw new Error('No auth header')
  const token = header.replace('Bearer ', '')
  // ANTI-PATTERN: hardcoded secret
  const payload = jwt.verify(token, 'super-secret-key-change-me') as { userId: number }
  return payload.userId
}

// GET /cards/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const card = await prisma.card.findUnique({ where: { id: parseInt(req.params.id) } })
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  const comments = await prisma.comment.findMany({ where: { cardId: card.id } })
  // ANTI-PATTERN: N+1 for labels
  const cardLabels = await prisma.cardLabel.findMany({ where: { cardId: card.id } })
  const labels = []
  for (const cl of cardLabels) {
    const label = await prisma.label.findUnique({ where: { id: cl.labelId } })
    labels.push(label)
  }
  res.json({ ...card, comments, labels })
})

// POST /cards — create card
router.post('/', async (req: Request, res: Response) => {
  try {
    verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

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
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const cardId = parseInt(req.params.id)
  const { targetListId, position } = req.body
  const CARD_NOT_FOUND = 'Card not found'
  const TARGET_LIST_NOT_FOUND = 'Target list not found'

  try {
    const event = await prisma.$transaction(async (tx) => {
      const card = await tx.card.findUnique({
        where: { id: cardId },
        include: { list: true },
      })

      if (!card) {
        throw new Error(CARD_NOT_FOUND)
      }

      const targetList = await tx.list.findUnique({ where: { id: targetListId } })

      if (!targetList) {
        throw new Error(TARGET_LIST_NOT_FOUND)
      }

      await tx.card.update({
        where: { id: cardId },
        data: { listId: targetListId, position },
      })

      return tx.activityEvent.create({
        data: {
          boardId: targetList.boardId,
          actorId: userId,
          eventType: 'card_moved',
          cardId,
          fromListId: card.listId,
          toListId: targetListId,
        },
      })
    })

    res.json({ ok: true, event })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message === CARD_NOT_FOUND || message === TARGET_LIST_NOT_FOUND) {
      res.status(404).json({ error: message })
      return
    }

    res.status(500).json({ error: 'Move failed', details: message })
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

  const { content } = req.body
  const cardId = parseInt(req.params.id)
  const comment = await prisma.comment.create({ data: { content, cardId, userId } })
  res.status(201).json(comment)
})

// DELETE /cards/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const cardId = parseInt(req.params.id)
  // ANTI-PATTERN: no ownership check — any authenticated user can delete any card
  await prisma.card.delete({ where: { id: cardId } })
  res.json({ ok: true })
})

export default router
