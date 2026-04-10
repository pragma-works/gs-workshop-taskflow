import { Router, Request, Response } from 'express'
import { requireAuth, AuthRequest } from '../middleware/auth'
import * as boardRepo from '../repositories/boardRepository'
import * as activityRepo from '../repositories/activityRepository'

const router = Router({ mergeParams: true })

// GET /boards/:id/activity — authenticated activity feed
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const userId  = (req as AuthRequest).userId
  const boardId = parseInt(req.params.id)

  const isMember = await boardRepo.isBoardMember(userId, boardId)
  if (!isMember) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  const events = await activityRepo.getActivityForBoard(boardId)
  res.json(events)
})

// GET /boards/:id/activity/preview — no-auth endpoint for testing
router.get('/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)
  const events  = await activityRepo.getActivityForBoard(boardId)
  res.json(events)
})

export default router

