import { Router, Request, Response } from 'express'
import { verifyToken } from '../auth'
import { getActivityEvents, isBoardMember } from '../repositories/taskflow'

const router = Router()

// GET /boards/:id/activity/preview — no-auth testing endpoint
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)
  const events = await getActivityEvents(boardId)
  res.json(events)
})

// GET /boards/:id/activity — chronological log of card moves and comments on this board
router.get('/:id/activity', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const boardId = parseInt(req.params.id)
  const isMember = await isBoardMember(userId, boardId)
  if (!isMember) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  const events = await getActivityEvents(boardId)
  res.json(events)
})

export default router
