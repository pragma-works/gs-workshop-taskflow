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

// PATCH /cards/:id/move — move card to different list with atomic activity logging
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

  try {
    // Fetch card to verify existence and get current list
    const card = await prisma.card.findUnique({ where: { id: cardId } })
    if (!card) {
      res.status(404).json({ error: 'Not found' })
      return
    }

    // Fetch target list to verify existence and get board ID
    const targetList = await prisma.list.findUnique({ where: { id: targetListId } })
    if (!targetList) {
      res.status(404).json({ error: 'Target list not found' })
      return
    }

    const boardId = targetList.boardId
    const fromListId = card.listId

    // Verify caller is a member of the board
    const isMember = await prisma.boardMember.findUnique({
      where: { userId_boardId: { userId, boardId } },
    })
    if (!isMember) {
      res.status(403).json({ error: 'Not a board member' })
      return
    }

    // Atomic transaction: update card AND create activity event
    const result = await prisma.$transaction(async (tx) => {
      // Update card position and list
      const updatedCard = await tx.card.update({
        where: { id: cardId },
        data: { listId: targetListId, position },
      })

      // Create activity event in the same transaction
      const event = await tx.activityEvent.create({
        data: {
          boardId,
          actorId: userId,
          eventType: 'card_moved',
          cardId,
          fromListId,
          toListId: targetListId,
        },
      })

      return { updatedCard, event }
    })

    res.json({ ok: true, event: result.event })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
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
