import { Router, Request, Response } from 'express'
import { verifyToken } from '../auth'
import { asyncHandler } from '../http'
import {
  addCommentForUser,
  createCardForUser,
  deleteCardForUser,
  getCardForUser,
  moveCardForUser,
} from '../services/card-service'

const router = Router()

// GET /cards/:id
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = verifyToken(req)
  const card = await getCardForUser(userId, parseInt(req.params.id))
  res.json(card)
}))

// POST /cards — create card
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = verifyToken(req)
  const { title, description, listId, assigneeId } = req.body
  const card = await createCardForUser(userId, { title, description, listId, assigneeId })
  res.status(201).json(card)
}))

// PATCH /cards/:id/move — move card to different list
router.patch('/:id/move', asyncHandler(async (req: Request, res: Response) => {
  const userId = verifyToken(req)
  const cardId = parseInt(req.params.id)
  const { targetListId, position } = req.body
  const event = await moveCardForUser(userId, cardId, targetListId, position)
  res.json({ ok: true, event })
}))

// POST /cards/:id/comments — add comment
router.post('/:id/comments', asyncHandler(async (req: Request, res: Response) => {
  const userId = verifyToken(req)
  const comment = await addCommentForUser(userId, parseInt(req.params.id), req.body.content)
  res.status(201).json(comment)
}))

// DELETE /cards/:id
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = verifyToken(req)
  await deleteCardForUser(userId, parseInt(req.params.id))
  res.json({ ok: true })
}))

export default router
