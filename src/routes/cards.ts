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
import {
  addCommentSchema,
  createCardSchema,
  idParamSchema,
  moveCardSchema,
  parseWithSchema,
} from '../validation'

const router = Router()

// GET /cards/:id
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = verifyToken(req)
  const { id } = parseWithSchema(idParamSchema, req.params)
  const card = await getCardForUser(userId, id)
  res.json(card)
}))

// POST /cards — create card
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = verifyToken(req)
  const { title, description, listId, assigneeId } = parseWithSchema(createCardSchema, req.body)
  const card = await createCardForUser(userId, { title, description, listId, assigneeId })
  res.status(201).json(card)
}))

// PATCH /cards/:id/move — move card to different list
router.patch('/:id/move', asyncHandler(async (req: Request, res: Response) => {
  const userId = verifyToken(req)
  const { id } = parseWithSchema(idParamSchema, req.params)
  const { targetListId, position } = parseWithSchema(moveCardSchema, req.body)
  const event = await moveCardForUser(userId, id, targetListId, position)
  res.json({ ok: true, event })
}))

// POST /cards/:id/comments — add comment
router.post('/:id/comments', asyncHandler(async (req: Request, res: Response) => {
  const userId = verifyToken(req)
  const { id } = parseWithSchema(idParamSchema, req.params)
  const { content } = parseWithSchema(addCommentSchema, req.body)
  const comment = await addCommentForUser(userId, id, content)
  res.status(201).json(comment)
}))

// DELETE /cards/:id
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = verifyToken(req)
  const { id } = parseWithSchema(idParamSchema, req.params)
  await deleteCardForUser(userId, id)
  res.json({ ok: true })
}))

export default router
