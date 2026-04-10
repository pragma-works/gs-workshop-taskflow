import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { asyncHandler } from '../middleware/async-handler'
import {
  addCommentToCard,
  createCardInList,
  deleteCardForUser,
  getCard,
  moveCardForUser,
} from '../services/cards-service'
import { parseId } from '../services/http-input'

const router = Router()

router.use(requireAuth)

// GET /cards/:id
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const cardId = parseId(req.params.id, 'id')
  const card = await getCard(cardId)
  res.json(card)
}))

// POST /cards — create card
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const card = await createCardInList(req.body)
  res.status(201).json(card)
}))

// PATCH /cards/:id/move — move card to different list
router.patch('/:id/move', asyncHandler(async (req: Request, res: Response) => {
  const cardId = parseId(req.params.id, 'id')
  const result = await moveCardForUser(req.authUserId as number, cardId, req.body)
  res.json(result)
}))

// POST /cards/:id/comments — add comment
router.post('/:id/comments', asyncHandler(async (req: Request, res: Response) => {
  const cardId = parseId(req.params.id, 'id')
  const comment = await addCommentToCard(req.authUserId as number, cardId, req.body)
  res.status(201).json(comment)
}))

// DELETE /cards/:id
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const cardId = parseId(req.params.id, 'id')
  const result = await deleteCardForUser(req.authUserId as number, cardId)
  res.json(result)
}))

export default router
