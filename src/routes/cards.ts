import { Router, Request, Response } from 'express'
import { verifyToken } from '../auth'
import {
  createCard,
  createComment,
  deleteCard,
  findCardById,
  getCardWithDetails,
  moveCardWithActivity,
} from '../repositories/taskflow'

const router = Router()

// GET /cards/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const card = await getCardWithDetails(parseInt(req.params.id))
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(card)
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
  const card = await createCard({ title, description, listId, assigneeId })
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

  const card = await findCardById(cardId)
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  // ANTI-PATTERN: no ownership/membership check before moving

  const fromListId = card.listId

  try {
    const event = await moveCardWithActivity({
      cardId,
      actorId: userId,
      fromListId,
      targetListId,
      position,
    })

    res.json({ ok: true, event })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
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
  const comment = await createComment({ content, cardId, userId })
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
  await deleteCard(cardId)
  res.json({ ok: true })
})

export default router
