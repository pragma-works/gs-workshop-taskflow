import { Router, Request, Response } from 'express'
import prisma from '../db'
import { verifyToken } from '../shared/middleware/auth'
import { getActivityFeed, getActivityPreview } from '../modules/activity/activityService'

const router = Router({ mergeParams: true })

/**
 * GET /boards/:id/activity
 * Auth required. Returns all ActivityEvents for the board, newest first.
 */
router.get('/:id/activity', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const boardId = parseInt(req.params.id)
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
  if (!membership) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  const events = await getActivityFeed(boardId)
  res.json(events)
})

/**
 * GET /boards/:id/activity/preview
 * No auth required. Returns the 20 most recent ActivityEvents for the board.
 * Intended for local development and integration testing.
 */
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)
  const events = await getActivityPreview(boardId)
  res.json(events)
})

export default router
