import { Router, Response } from 'express'
import { requireAuth, AuthRequest } from '../middleware/auth'
import * as cardRepo from '../repositories/cardRepository'
import * as boardRepo from '../repositories/boardRepository'

const router = Router()

// GET /cards/:id
router.get('/:id', requireAuth, async (req, res: Response) => {
  const card = await cardRepo.findCardWithDetails(parseInt(req.params.id))
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(card)
})

// POST /cards — create card
router.post('/', requireAuth, async (req, res: Response) => {
  const { title, description, listId, assigneeId } = req.body
  const card = await cardRepo.createCard({ title, description, listId, assigneeId })
  res.status(201).json(card)
})

// PATCH /cards/:id/move — move card to different list
router.patch('/:id/move', requireAuth, async (req, res: Response) => {
  const { userId } = req as AuthRequest
  const cardId = parseInt(req.params.id)
  const { targetListId, position } = req.body

  const card = await cardRepo.findCard(cardId)
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  // Resolve boardId from the card's current list
  const currentCard = await cardRepo.findCardWithDetails(cardId)
  if (!currentCard) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const updatedCard = await cardRepo.moveCard(cardId, targetListId, position, userId, currentCard.list.boardId)
  res.json(updatedCard)
})

// POST /cards/:id/comments — add comment
router.post('/:id/comments', requireAuth, async (req, res: Response) => {
  const { userId } = req as AuthRequest
  const { content } = req.body
  const cardId = parseInt(req.params.id)

  const card = await cardRepo.findCardWithDetails(cardId)
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const comment = await cardRepo.addComment(cardId, userId, content, card.list.boardId)
  res.status(201).json(comment)
})

// DELETE /cards/:id
router.delete('/:id', requireAuth, async (req, res: Response) => {
  const cardId = parseInt(req.params.id)
  await cardRepo.deleteCard(cardId)
  res.json({ ok: true })
})

export default router
