import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { getMembership } from '../services/boardService'
import { getActivityForBoard, formatEvents } from '../services/activityService'

const router = Router({ mergeParams: true })

// GET /boards/:id/activity — authenticated
router.get('/:id/activity', requireAuth, async (req: Request, res: Response) => {
  const userId = res.locals.userId as number
  const boardId = parseInt(req.params.id)

  const membership = await getMembership(userId, boardId)
  if (!membership) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  const events = await getActivityForBoard(boardId)
  res.json(formatEvents(events))
})

// GET /boards/:id/activity/preview — no auth required; for testing
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)
  const events = await getActivityForBoard(boardId)
  res.json(formatEvents(events))
})

export default router
