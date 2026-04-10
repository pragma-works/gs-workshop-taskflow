import { Router, Request, Response } from 'express'
import { verifyToken } from '../middleware/auth'
import * as cardRepo from '../repositories/cardRepository'
import { checkMembership } from '../repositories/boardRepository'

const router = Router()

// GET /cards/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const card = await cardRepo.findCardWithDetails(parseInt(req.params.id))
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json({
    ...card,
    labels: card.labels.map((cl) => cl.label),
  })
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
  const card = await cardRepo.createCard({ title, description, listId, assigneeId })
  res.status(201).json(card)
})

// PATCH /cards/:id/move — move card to different list (atomic with activity logging)
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

  const card = await cardRepo.findCardWithList(cardId)
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const boardId = card.list.boardId
  const isMember = await checkMembership(userId, boardId)
  if (!isMember) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  const targetList = await cardRepo.findListById(targetListId)
  if (!targetList) {
    res.status(404).json({ error: 'Target list not found' })
    return
  }

  try {
    const { event } = await cardRepo.moveCardWithActivity({
      cardId,
      targetListId,
      position,
      userId,
      boardId,
      fromListId: card.listId,
    })
    res.json({ ok: true, event })
  } catch (err: any) {
    res.status(500).json({ error: 'Move failed', details: err.message })
  }
})

// POST /cards/:id/comments — add comment (with activity logging)
router.post('/:id/comments', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const cardId = parseInt(req.params.id)
  const { content } = req.body

  const card = await cardRepo.findCardWithList(cardId)
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const boardId = card.list.boardId

  try {
    const { comment, event } = await cardRepo.createCommentWithActivity({
      content,
      cardId,
      userId,
      boardId,
    })
    res.status(201).json(comment)
  } catch (err: any) {
    res.status(500).json({ error: 'Comment failed', details: err.message })
  }
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
  await cardRepo.deleteCard(cardId)
  res.json({ ok: true })
})

export default router
