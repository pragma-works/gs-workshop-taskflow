import { Router, Response, NextFunction } from 'express'
import { boardService } from '../services/boardService'
import { authenticate } from '../middleware/auth'
import { AuthRequest } from '../types'

const router = Router()

router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const boards = await boardService.listForUser(req.userId!)
    res.json(boards)
  } catch (err) {
    next(err)
  }
})

router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const board = await boardService.getWithDetails(req.userId!, parseInt(req.params.id))
    res.json(board)
  } catch (err) {
    next(err)
  }
})

router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body
    const board = await boardService.create(name, req.userId!)
    res.status(201).json(board)
  } catch (err) {
    next(err)
  }
})

router.post('/:id/members', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const boardId = parseInt(req.params.id)
    const { memberId } = req.body
    await boardService.addMember(req.userId!, boardId, memberId)
    res.status(201).json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
