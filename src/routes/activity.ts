import { Router, Request, Response } from 'express'
import { verifyToken } from '../auth'
import { getBoardActivity, isBoardMember } from '../services/activityService'

const router = Router({ mergeParams: true })

// GET /boards/:id/activity — authenticated; reverse chronological activity for the board
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

  const events = await getBoardActivity(boardId)
  res.json(events)
})

// GET /boards/:id/activity/preview — no auth required; for testing
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)
  const events = await getBoardActivity(boardId)
  res.json(events)
})

export default router
