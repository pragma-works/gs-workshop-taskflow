import { Router, Request, Response, NextFunction } from 'express'
import { activityService } from '../services/activityService'
import { authenticate } from '../middleware/auth'
import { AuthRequest } from '../types'

const router = Router()

router.get('/:id/activity', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const boardId = parseInt(req.params.id)
    const events = await activityService.getByBoard(req.userId!, boardId)
    res.json({ events })
  } catch (err) {
    next(err)
  }
})

router.get('/:id/activity/preview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const boardId = parseInt(req.params.id)
    const events = await activityService.getPreview(boardId)
    res.json({ events })
  } catch (err) {
    next(err)
  }
})

export default router
