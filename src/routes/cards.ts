import { Router, Request, Response, NextFunction } from 'express'
import prisma from '../db'
import { verifyToken } from '../auth'
import { CardService } from '../services/CardService'
import { PrismaCardRepository } from '../repositories/PrismaCardRepository'
import { PrismaListRepository } from '../repositories/PrismaListRepository'
import { PrismaCommentRepository } from '../repositories/PrismaCommentRepository'

const router = Router()

// Manual dependency injection — one instance per module.
const cardService = new CardService(
  new PrismaCardRepository(),
  new PrismaListRepository(),
  new PrismaCommentRepository(),
)

// GET /cards/:id — not part of new feature; unchanged (N+1 is a pre-existing issue)
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
  // ANTI-PATTERN: N+1 for labels (pre-existing, out of scope)
  const cardLabels = await prisma.cardLabel.findMany({ where: { cardId: card.id } })
  const labels = []
  for (const cl of cardLabels) {
    const label = await prisma.label.findUnique({ where: { id: cl.labelId } })
    labels.push(label)
  }
  res.json({ ...card, comments, labels })
})

// POST /cards — create card + card_created event (atomic via CardService)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const { title, description, listId, assigneeId } = req.body
    const card = await cardService.createCard({ title, description, listId, assigneeId }, userId)
    res.status(201).json(card)
  } catch (err) {
    next(err)
  }
})

// PATCH /cards/:id/move — move card + card_moved event (atomic via CardService)
router.patch('/:id/move', async (req: Request, res: Response, next: NextFunction) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const cardId = parseInt(req.params.id)
    const { targetListId, position } = req.body
    await cardService.moveCard(cardId, targetListId, position, userId)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// POST /cards/:id/comments — add comment + card_commented event (atomic via CardService)
router.post('/:id/comments', async (req: Request, res: Response, next: NextFunction) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const cardId = parseInt(req.params.id)
    const { content } = req.body
    const comment = await cardService.addComment(cardId, content, userId)
    res.status(201).json(comment)
  } catch (err) {
    next(err)
  }
})

// DELETE /cards/:id — not part of new feature; unchanged
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const cardId = parseInt(req.params.id)
  // ANTI-PATTERN: no ownership check (pre-existing, out of scope)
  await prisma.card.delete({ where: { id: cardId } })
  res.json({ ok: true })
})

export default router
