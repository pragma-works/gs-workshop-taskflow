import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import * as cardService from '../services/card.service'

const router = Router()

// GET /cards/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const card = await cardService.getCard(parseInt(req.params.id))
    res.json(card)
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

// POST /cards — create card
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { title, description, listId, assigneeId } = req.body
  const card = await cardService.createCard({ title, description, listId, assigneeId })
  res.status(201).json(card)
})

// PATCH /cards/:id/move — move card to different list (atomic with activity event)
router.patch('/:id/move', requireAuth, async (req: Request, res: Response) => {
  try {
    const cardId = parseInt(req.params.id)
    const { targetListId, position } = req.body
    await cardService.moveCard(cardId, targetListId, position, (req as any).userId)
    res.json({ ok: true })
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

// POST /cards/:id/comments — add comment (with activity event)
router.post('/:id/comments', requireAuth, async (req: Request, res: Response) => {
  try {
    const cardId = parseInt(req.params.id)
    const { content } = req.body
    const comment = await cardService.addComment(cardId, content, (req as any).userId)
    res.status(201).json(comment)
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

// DELETE /cards/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const cardId = parseInt(req.params.id)
    await cardService.deleteCard(cardId)
    res.json({ ok: true })
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

export default router
