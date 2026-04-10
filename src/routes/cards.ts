import { Router, Request, Response, NextFunction } from 'express'
import { HttpError } from '../errors'
import { verifyToken } from '../middleware/auth'
import { CardService } from '../services/cardService'

const router = Router()
const cardService = new CardService()

// GET /cards/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = verifyToken(req)
    const cardId = parseInt(req.params.id, 10)
    const card = await cardService.getCardById(userId, cardId)
    res.json(card)
  } catch (error) {
    next(error)
  }
})

// POST /cards — create card
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = verifyToken(req)
    const rawListId = req.body.listId
    const rawAssigneeId = req.body.assigneeId

    const card = await cardService.createCard(userId, {
      title: req.body.title,
      description: req.body.description,
      listId: Number(rawListId),
      assigneeId: rawAssigneeId !== undefined && rawAssigneeId !== null ? Number(rawAssigneeId) : null,
    })

    res.status(201).json(card)
  } catch (error) {
    next(error)
  }
})

// PATCH /cards/:id/move — move card to different list
router.patch('/:id/move', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = verifyToken(req)
    const cardId = parseInt(req.params.id, 10)
    const targetListId = Number(req.body.targetListId)
    const position = Number(req.body.position)

    const result = await cardService.moveCardWithActivity(userId, cardId, targetListId, position)
    res.json(result)
  } catch (error) {
    if (error instanceof HttpError && error.status === 500 && error.message === 'Move failed') {
      res.status(500).json({ error: 'Move failed', details: error.details ?? 'Unknown error' })
      return
    }

    next(error)
  }
})

// POST /cards/:id/comments — add comment
router.post('/:id/comments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = verifyToken(req)
    const cardId = parseInt(req.params.id, 10)
    const comment = await cardService.addComment(userId, cardId, req.body.content)
    res.status(201).json(comment)
  } catch (error) {
    next(error)
  }
})

// DELETE /cards/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = verifyToken(req)
    const cardId = parseInt(req.params.id, 10)
    const result = await cardService.deleteCard(userId, cardId)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

export default router
