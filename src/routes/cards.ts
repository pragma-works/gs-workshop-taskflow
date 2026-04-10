import { Router, Request, Response } from 'express'
import { verifyToken } from '../middleware/auth'
import {
  getCardById,
  getCardRaw,
  getListById,
  createCard,
  moveCard,
  addComment,
  deleteCard,
} from '../services/cardService'

const router = Router()

// GET /cards/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const card = await getCardById(parseInt(req.params.id))
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(card)
})

// POST /cards — create card
router.post('/', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { title, description, listId, assigneeId } = req.body

  const list = await getListById(listId)
  if (!list) {
    res.status(404).json({ error: 'List not found' })
    return
  }

  const card = await createCard(title, description, listId, assigneeId, list.boardId, userId)
  res.status(201).json(card)
})

// PATCH /cards/:id/move — move card to different list (atomic)
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

  const card = await getCardRaw(cardId)
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const targetList = await getListById(targetListId)
  if (!targetList) {
    res.status(404).json({ error: 'Target list not found' })
    return
  }

  try {
    const { event } = await moveCard(cardId, card.listId, targetListId, position, targetList.boardId, userId)
    res.json({ ok: true, event })
  } catch (err: any) {
    res.status(500).json({ error: 'Move failed', details: err.message })
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

  const card = await getCardRaw(cardId)
  if (!card) {
    res.status(404).json({ error: 'Card not found' })
    return
  }

  const list = await getListById(card.listId)
  if (!list) {
    res.status(404).json({ error: 'List not found' })
    return
  }

  const comment = await addComment(content, cardId, userId, list.boardId)
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
  await deleteCard(cardId)
  res.json({ ok: true })
})

export default router
