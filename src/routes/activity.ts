import { Router, Response } from 'express'
import { ActivityService } from '../services/ActivityService'
import { requireAuth, AuthRequest } from '../middleware/auth'

export function createActivityRouter(activityService: ActivityService) {
  const router = Router()

  router.get('/:id/activity', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const events = await activityService.getFeedAuthenticated(
        req.userId!,
        parseInt(req.params.id),
      )
      res.json(events)
    } catch (err: any) {
      res.status(err.status ?? 500).json({ error: err.message })
    }
  })

  router.get('/:id/activity/preview', async (req, res) => {
    const events = await activityService.getFeedPreview(parseInt(req.params.id))
    res.json(events)
  })

  return router
}
