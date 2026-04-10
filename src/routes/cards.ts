import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import * as cardService from '../services/cardService'

const router = Router()

// GET /cards/:id
router.get('/:id', authenticate, async (req, res: Response) => {
  const card = await cardService.getCardById(parseInt(req.params.id))
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(card)
})

// POST /cards — create card
router.post('/', authenticate, async (req, res: Response) => {
  const { title, description, listId, assigneeId } = req.body
  const card = await cardService.createCard(title, listId, description, assigneeId)
  res.status(201).json(card)
})

// PATCH /cards/:id/move — move card to different list
router.patch('/:id/move', authenticate, async (req, res: Response) => {
  const cardId = parseInt(req.params.id)
  const { targetListId, position } = req.body

  const existing = await cardService.getCardById(cardId)
  if (!existing) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  await cardService.moveCard(cardId, targetListId, position)
  res.json({ ok: true })
})

// POST /cards/:id/comments — add comment
router.post('/:id/comments', authenticate, async (req, res: Response) => {
  const userId = (req as AuthRequest).userId
  const { content } = req.body
  const cardId = parseInt(req.params.id)
  const comment = await cardService.addComment(cardId, userId, content)
  res.status(201).json(comment)
})

// DELETE /cards/:id
router.delete('/:id', authenticate, async (req, res: Response) => {
  const cardId = parseInt(req.params.id)
  await cardService.deleteCard(cardId)
  res.json({ ok: true })
})

export default router
