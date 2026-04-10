import { Router, Request, Response } from 'express'
import { verifyToken } from '../middleware/auth'
import { getCardWithDetails, createCard, deleteCard, addComment, getList, moveCardAtomic } from '../repositories/cardService'

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
  const card = await createCard({ title, description, listId, assigneeId })
  res.status(201).json(card)
})

// PATCH /cards/:id/move — atomic transaction with ActivityEvent
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

  const card = await getCardWithDetails(cardId)
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const targetList = await getList(targetListId)
  if (!targetList) {
    res.status(404).json({ error: 'Target list not found' })
    return
  }

  const fromListId = card.listId

  try {
    const [, event] = await moveCardAtomic({
      cardId,
      targetListId,
      position,
      fromListId,
      boardId: targetList.boardId,
      actorId: userId,
    })
    res.json({ ok: true, event })
  } catch (err) {
    res.status(500).json({ error: 'Move failed', details: (err as Error).message })
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
  const comment = await addComment(cardId, userId, content)
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
