import { Router, Request, Response } from 'express'
import { verifyToken } from '../lib/auth'
import { isBoardMember } from '../repositories/boards.repo'
import { getActivityByBoard } from '../repositories/activity.repo'

const router = Router()

function formatEvents(events: Awaited<ReturnType<typeof getActivityByBoard>>) {
  return events.map(e => ({
    ...e,
    actorName: e.actor.name,
    cardTitle: e.card?.title ?? null,
    fromListName: e.fromList?.name ?? null,
    toListName: e.toList?.name ?? null,
  }))
}

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
  const isMember = await isBoardMember(userId, boardId)
  if (!isMember) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  const events = await getActivityByBoard(boardId)
  res.json(formatEvents(events))
})

// GET /boards/:id/activity/preview — no auth required; for testing
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)
  const events = await getActivityByBoard(boardId)
  res.json(formatEvents(events))
})

export default router
