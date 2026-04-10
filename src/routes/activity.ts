import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import * as activityService from '../services/activity.service'

const router = Router({ mergeParams: true })

// GET /boards/:id/activity — all activity events (auth required)
router.get('/:id/activity', requireAuth, async (req: Request, res: Response) => {
  try {
    const boardId = parseInt(req.params.id)
    const result = await activityService.getActivityFeed(boardId, (req as any).userId)
    res.json(result)
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

// GET /boards/:id/activity/preview — last 10 events (no auth)
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  try {
    const boardId = parseInt(req.params.id)
    const result = await activityService.getActivityPreview(boardId)
    res.json(result)
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

export default router
