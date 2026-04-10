import { Router, Request, Response } from 'express'
import * as jwt from 'jsonwebtoken'
import prisma from '../db'

const router = Router()

function verifyToken(req: Request): number {
  const header = req.headers.authorization
  if (!header) throw new Error('No auth header')
  const token = header.replace('Bearer ', '')
  const payload = jwt.verify(token, 'super-secret-key-change-me') as { userId: number }
  return payload.userId
}

async function fetchEvents(boardId: number) {
  const events = await prisma.activityEvent.findMany({
    where: { boardId },
    orderBy: { createdAt: 'desc' },
    include: {
      actor:    true,
      card:     true,
      fromList: true,
      toList:   true,
    },
  })
  return events.map(e => ({
    id:           e.id,
    boardId:      e.boardId,
    actorId:      e.actorId,
    actorName:    e.actor.name,
    eventType:    e.eventType,
    cardId:       e.cardId,
    cardTitle:    e.card?.title    ?? null,
    fromListName: e.fromList?.name ?? null,
    toListName:   e.toList?.name   ?? null,
    timestamp:    e.createdAt,
  }))
}

// GET /boards/:id/activity — auth required (2 queries: membership check + events with include)
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

  res.json(await fetchEvents(boardId))
})

// GET /boards/:id/activity/preview — no auth required (1 query: events with include)
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)
  res.json(await fetchEvents(boardId))
})

export default router
