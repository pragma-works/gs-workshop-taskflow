import { Router, Request, Response } from 'express'
import { verifyToken } from '../middleware/auth'
import { checkMembership, findBoardById } from '../repositories/boardRepository'
import { getActivityForBoard, getActivityPreview } from '../repositories/activityRepository'

const router = Router()

// GET /boards/:id/activity — authenticated, full activity feed
router.get('/:id/activity', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const boardId = parseInt(req.params.id)

  const board = await findBoardById(boardId)
  if (!board) {
    res.status(404).json({ error: 'Board not found' })
    return
  }

  const isMember = await checkMembership(userId, boardId)
  if (!isMember) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  const events = await getActivityForBoard(boardId)
  res.json({ events })
})

// GET /boards/:id/activity/preview — no auth, last 10 events
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)

  const board = await findBoardById(boardId)
  if (!board) {
    res.status(404).json({ error: 'Board not found' })
    return
  }

  const events = await getActivityPreview(boardId)
  res.json({ events })
})

export default router
