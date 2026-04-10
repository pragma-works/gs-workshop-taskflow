import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { getCardById, createCard, moveCard, addComment, deleteCard } from '../services/cardService'
import { getMembership } from '../services/boardService'

const router = Router()

// GET /cards/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const card = await getCardById(parseInt(req.params.id))
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(card)
})

// POST /cards — create card
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { title, description, listId, assigneeId } = req.body
  const card = await createCard(title, description, listId, assigneeId)
  res.status(201).json(card)
})

// PATCH /cards/:id/move — move card to different list
router.patch('/:id/move', requireAuth, async (req: Request, res: Response) => {
  const userId = res.locals.userId as number
  const cardId = parseInt(req.params.id)
  const { targetListId, position } = req.body

  const card = await getCardById(cardId)
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const membership = await getMembership(userId, card.list.boardId)
  if (!membership) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  try {
    const result = await moveCard(cardId, targetListId, position, userId)
    res.json(result)
  } catch (err) {
    if (err instanceof Error && err.message === 'Not found') {
      res.status(404).json({ error: 'Not found' })
      return
    }
    const details = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: 'Move failed', details })
  }
})

// POST /cards/:id/comments — add comment
router.post('/:id/comments', requireAuth, async (req: Request, res: Response) => {
  const userId = res.locals.userId as number
  const { content } = req.body
  const cardId = parseInt(req.params.id)
  const comment = await addComment(cardId, userId, content)
  res.status(201).json(comment)
})

// DELETE /cards/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const userId = res.locals.userId as number
  const cardId = parseInt(req.params.id)

  const card = await getCardById(cardId)
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const membership = await getMembership(userId, card.list.boardId)
  if (!membership) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  await deleteCard(cardId)
  res.json({ ok: true })
})

export default router
