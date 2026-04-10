import { Router, Request, Response } from 'express'
import { verifyToken, AuthRequest } from '../middleware/auth'
import activityService from '../services/ActivityService'

const router = Router()

// GET /boards/:id/activity — authenticated activity feed
router.get('/:id/activity', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const boardId = parseInt(req.params.id)
    const events = await activityService.getActivityFeed(boardId, req.userId!)
    res.json(events)
  } catch (error) {
    if ((error as Error).message === 'Not a board member') {
      res.status(403).json({ error: 'Not a board member' })
    } else {
      res.status(500).json({ error: 'Failed to get activity', details: (error as Error).message })
    }
  }
})

// GET /boards/:id/activity/preview — no-auth testing endpoint
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  try {
    const boardId = parseInt(req.params.id)
    const events = await activityService.getActivityPreview(boardId)
    res.json(events)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get activity preview', details: (error as Error).message })
  }
})

export default router
