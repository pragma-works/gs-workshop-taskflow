import { Router, Request, Response } from 'express'
import * as jwt from 'jsonwebtoken'
import prisma from '../db'

const router = Router({ mergeParams: true })

function verifyToken(req: Request): number {
  const header = req.headers.authorization
  if (!header) throw new Error('No auth header')
  const token = header.replace('Bearer ', '')
  const payload = jwt.verify(token, 'super-secret-key-change-me') as { userId: number }
  return payload.userId
}

const activityInclude = {
  actor:    { select: { name: true } },
  card:     { select: { title: true } },
  fromList: { select: { name: true } },
  toList:   { select: { name: true } },
} as const

function formatEvents(events: any[]) {
  return events.map((e) => ({
    id:           e.id,
    eventType:    e.eventType,
    createdAt:    e.createdAt,
    boardId:      e.boardId,
    cardId:       e.cardId,
    actorName:    e.actor.name,
    cardTitle:    e.card?.title ?? null,
    fromListName: e.fromList?.name ?? null,
    toListName:   e.toList?.name ?? null,
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

  // Query 1: membership check
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
  if (!membership) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  // Query 2: events with all relations in a single query
  const events = await prisma.activityEvent.findMany({
    where:   { boardId },
    orderBy: { createdAt: 'desc' },
    include: activityInclude,
  })

  res.json(formatEvents(events))
})

// GET /boards/:id/activity/preview — no auth required; for testing
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)

  // Single query: events with all relations
  const events = await prisma.activityEvent.findMany({
    where:   { boardId },
    orderBy: { createdAt: 'desc' },
    include: activityInclude,
  })

  res.json(formatEvents(events))
})

export default router
