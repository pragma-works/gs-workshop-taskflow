import { Router, Request, Response } from 'express'
import { verifyToken } from '../middleware/auth'
import { findMembership } from '../repositories/boardRepo'
import { findActivityByBoard } from '../repositories/activityRepo'

const router = Router()

// GET /boards/:id/activity — authenticated
router.get('/:id/activity', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const boardId = parseInt(req.params.id)
  const membership = await findMembership(userId, boardId)
  if (!membership) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  const events = await findActivityByBoard(boardId)
  res.json(events)
})

// GET /boards/:id/activity/preview — no auth required
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)
  const events = await findActivityByBoard(boardId)
  res.json(events)
})

export default router
