import { Router, Response, NextFunction } from 'express'
import { getContainer } from '../container'
import { authenticate } from '../middleware/auth'
import { AuthRequest, BadRequestError } from '../types'

const router = Router()

router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const boards = await getContainer().boardService.listForUser(req.userId!)
    res.json(boards)
  } catch (err) {
    next(err)
  }
})

router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const board = await getContainer().boardService.getWithDetails(req.userId!, parseInt(req.params.id))
    res.json(board)
  } catch (err) {
    next(err)
  }
})

router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body
    if (!name) throw new BadRequestError('name is required')
    const board = await getContainer().boardService.create(name, req.userId!)
    res.status(201).json(board)
  } catch (err) {
    next(err)
  }
})

router.post('/:id/members', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const boardId = parseInt(req.params.id)
    const { memberId } = req.body
    if (!memberId) throw new BadRequestError('memberId is required')
    await getContainer().boardService.addMember(req.userId!, boardId, memberId)
    res.status(201).json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
