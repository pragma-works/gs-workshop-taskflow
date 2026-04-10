import { Router, Response, NextFunction } from 'express'
import { cardService } from '../services/cardService'
import { authenticate } from '../middleware/auth'
import { AuthRequest } from '../types'

const router = Router()

router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const card = await cardService.getById(parseInt(req.params.id))
    res.json(card)
  } catch (err) {
    next(err)
  }
})

router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, description, listId, assigneeId } = req.body
    const card = await cardService.create({ title, description, listId, assigneeId })
    res.status(201).json(card)
  } catch (err) {
    next(err)
  }
})

router.patch('/:id/move', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cardId = parseInt(req.params.id)
    const { targetListId, position } = req.body
    const result = await cardService.moveCard(req.userId!, cardId, targetListId, position)
    res.json({ ok: true, event: result.event })
  } catch (err) {
    next(err)
  }
})

router.post('/:id/comments', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cardId = parseInt(req.params.id)
    const { content } = req.body
    const result = await cardService.addComment(req.userId!, cardId, content)
    res.status(201).json(result.comment)
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cardId = parseInt(req.params.id)
    await cardService.delete(cardId)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
