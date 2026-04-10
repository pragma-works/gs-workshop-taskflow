import { Router, Request, Response } from 'express'
import { verifyToken } from '../middleware/auth'
import { isBoardMember, boardExists } from '../repositories/boardRepository'
import { getActivityForBoard, getActivityPreview } from '../repositories/activityRepository'

const router = Router({ mergeParams: true })

// GET /boards/:id/activity — full activity feed (auth required)
router.get('/', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const boardId = parseInt(req.params.id)

  const exists = await boardExists(boardId)
  if (!exists) {
    res.status(404).json({ error: 'Board not found' })
    return
  }

  const member = await isBoardMember(userId, boardId)
  if (!member) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  const events = await getActivityForBoard(boardId)
  res.json({ events })
})

// GET /boards/:id/activity/preview — last 10 events, no auth required
router.get('/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)

  const exists = await boardExists(boardId)
  if (!exists) {
    res.status(404).json({ error: 'Board not found' })
    return
  }

  const events = await getActivityPreview(boardId)
  res.json({ events })
})

export default router
