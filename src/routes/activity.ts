import { Router, Request, Response } from 'express'
import { verifyToken } from '../middleware/auth'
import * as activityService from '../services/activity.service'

const router = Router({ mergeParams: true })

// GET /boards/:id/activity — all activity events (auth required)
router.get('/:id/activity', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const boardId = parseInt(req.params.id)
    const result = await activityService.getActivityFeed(boardId, userId)
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
