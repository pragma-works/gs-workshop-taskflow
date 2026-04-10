import { Router, Request, Response } from 'express'
import prisma from '../db'
import { verifyToken } from '../auth'

const router = Router()

const activityInclude = {
  actor: { select: { name: true } },
  card: { select: { title: true } },
  fromList: { select: { name: true } },
  toList: { select: { name: true } },
}

function formatEvents(events: any[]) {
  return events.map(e => ({
    id: e.id,
    boardId: e.boardId,
    actorId: e.actorId,
    actorName: e.actor.name,
    eventType: e.eventType,
    cardId: e.cardId ?? null,
    cardTitle: e.card?.title ?? null,
    fromListName: e.fromList?.name ?? null,
    toListName: e.toList?.name ?? null,
    timestamp: e.createdAt,
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
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
  if (!membership) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  const events = await prisma.activityEvent.findMany({
    where: { boardId },
    orderBy: { createdAt: 'desc' },
    include: activityInclude,
  })
  res.json(formatEvents(events))
})

// GET /boards/:id/activity/preview — no auth required
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)
  const events = await prisma.activityEvent.findMany({
    where: { boardId },
    orderBy: { createdAt: 'desc' },
    include: activityInclude,
  })
  res.json(formatEvents(events))
})

export default router
