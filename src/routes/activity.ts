import { Router, Request, Response } from 'express'
import { verifyToken } from '../middleware/auth'
import { isBoardMember } from '../services/boardService'
import { getActivityForBoard, formatEvents } from '../services/activityService'

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

  const member = await isBoardMember(userId, boardId)
  if (!member) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  const events = await getActivityForBoard(boardId)
  res.json(formatEvents(events))
})

// GET /boards/:id/activity/preview — no auth (for testing)
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)
  const events = await getActivityForBoard(boardId)
  res.json(formatEvents(events))
})

export default router
