import { Router } from 'express'
import { authenticate } from '../auth'
import { PrismaActivityRepository } from '../repositories/PrismaActivityRepository'
import { PrismaBoardMemberRepository } from '../repositories/PrismaBoardMemberRepository'
import { ActivityService } from '../services/ActivityService'

// mergeParams: true makes :id from the parent mount (/boards/:id/activity) visible.
const router = Router({ mergeParams: true })

const activityRepo    = new PrismaActivityRepository()
const boardMemberRepo = new PrismaBoardMemberRepository()
const activityService = new ActivityService(activityRepo, boardMemberRepo)

// GET /boards/:id/activity  — auth required
router.get('/', authenticate, async (req, res, next) => {
  try {
    const boardId = Number((req.params as any).id)
    const userId  = (req as any).user.id
    const events  = await activityService.getForBoard(
      boardId,
      userId,
      req.query.limit,
      req.query.offset,
    )
    res.json(events)
  } catch (err) {
    next(err)
  }
})

// GET /boards/:id/activity/preview  — no auth (dev/test only)
router.get('/preview', async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      res.status(404).json({ error: 'Not found' })
      return
    }

    const boardId = Number((req.params as any).id)
    const events  = await activityService.getPreview(
      boardId,
      req.query.limit,
      req.query.offset,
    )
    res.json(events)
  } catch (err) {
    next(err)
  }
})

export default router
