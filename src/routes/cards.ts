import { Router, Response, NextFunction } from 'express'
import { getContainer } from '../container'
import { authenticate } from '../middleware/auth'
import { AuthRequest, BadRequestError } from '../types'

const router = Router()

router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const card = await getContainer().cardService.getById(parseInt(req.params.id))
    res.json(card)
  } catch (err) {
    next(err)
  }
})

router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, description, listId, assigneeId } = req.body
    if (!title || !listId) throw new BadRequestError('title and listId are required')
    const card = await getContainer().cardService.create({ title, description, listId, assigneeId })
    res.status(201).json(card)
  } catch (err) {
    next(err)
  }
})

async function handleMove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const cardId = parseInt(req.params.id)
    const targetListId = req.body.targetListId ?? req.body.columnId
    const position = req.body.position ?? 0
    if (!targetListId) throw new BadRequestError('targetListId or columnId is required')
    const result = await getContainer().cardService.moveCard(req.userId!, cardId, targetListId, position)
    res.json({ ok: true, event: result.event })
  } catch (err) {
    next(err)
  }
}

router.patch('/:id/move', authenticate, handleMove)
router.post('/:id/move', authenticate, handleMove)

router.post('/:id/comments', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cardId = parseInt(req.params.id)
    const { content } = req.body
    if (!content) throw new BadRequestError('content is required')
    const result = await getContainer().cardService.addComment(req.userId!, cardId, content)
    res.status(201).json(result.comment)
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cardId = parseInt(req.params.id)
    await getContainer().cardService.delete(cardId)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
