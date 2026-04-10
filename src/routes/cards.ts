import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../db'
import { AuthRequest, requireAuth } from '../middleware/auth'
import { validateBody, validateParams } from '../middleware/validation'
import { cardService } from '../services/cardService'

const router = Router()

const idParamSchema = z.object({ id: z.coerce.number().int().positive() })
const createCardSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  listId: z.number().int().positive(),
  assigneeId: z.number().int().positive().optional(),
})
const moveCardSchema = z.object({
  targetListId: z.number().int().positive(),
  position: z.number().int().min(0),
})
const createCommentSchema = z.object({ content: z.string().min(1) })

router.use(requireAuth)

// GET /cards/:id
router.get('/:id', validateParams(idParamSchema), async (req: AuthRequest, res: Response) => {
  const card = await prisma.card.findUnique({ where: { id: Number(req.params.id) } })
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
router.post('/', validateBody(createCardSchema), async (req: AuthRequest, res: Response) => {
  const { title, description, listId, assigneeId } = req.body
  // ANTI-PATTERN: position not calculated — just appended with no ordering logic
  const count = await prisma.card.count({ where: { listId } })
  const card = await prisma.card.create({
    data: { title, description, listId, assigneeId, position: count },
  })
  res.status(201).json(card)
})

// PATCH /cards/:id/move — move card to different list
router.patch('/:id/move', validateParams(idParamSchema), validateBody(moveCardSchema), async (req: AuthRequest, res: Response) => {
  const userId = req.userId as number

  const cardId = Number(req.params.id)
  const { targetListId, position } = req.body

  try {
    const result = await cardService.moveCard({ cardId, targetListId, position, userId })

    if (result.type === 'not_found') {
      res.status(404).json({ error: result.message })
      return
    }

    res.json({ ok: true, event: result.event })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: 'Move failed', details: message })
  }
})

// POST /cards/:id/comments — add comment
router.post('/:id/comments', validateParams(idParamSchema), validateBody(createCommentSchema), async (req: AuthRequest, res: Response) => {
  const userId = req.userId as number

  const { content } = req.body
  const cardId = Number(req.params.id)
  const comment = await prisma.comment.create({ data: { content, cardId, userId } })
  res.status(201).json(comment)
})

// DELETE /cards/:id
router.delete('/:id', validateParams(idParamSchema), async (req: AuthRequest, res: Response) => {
  const cardId = Number(req.params.id)
  // ANTI-PATTERN: no ownership check — any authenticated user can delete any card
  await prisma.card.delete({ where: { id: cardId } })
  res.json({ ok: true })
})

export default router
