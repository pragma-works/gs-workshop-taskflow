import { Router, Request, Response } from 'express'
import { verifyToken } from '../middleware/auth'
import { isMember } from '../repositories/boardService'
import { getActivityForBoard } from '../repositories/activityService'

const router = Router({ mergeParams: true })

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
  const member = await isMember(userId, boardId)
  if (!member) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  const events = await getActivityForBoard(boardId)
  res.json(events)
})

// GET /boards/:id/activity/preview — no auth, for testing
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)
  const events = await getActivityForBoard(boardId)
  res.json(events)
})

export default router
