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

const activityInclude = {
  actor:    { select: { name: true } },
  card:     { select: { title: true } },
  fromList: { select: { name: true } },
  toList:   { select: { name: true } },
} as const

function formatEvents(events: Awaited<ReturnType<typeof fetchEvents>>) {
  return events.map(e => ({
    id:           e.id,
    boardId:      e.boardId,
    eventType:    e.eventType,
    createdAt:    e.createdAt,
    actorId:      e.actorId,
    actorName:    e.actor.name,
    cardId:       e.cardId,
    cardTitle:    e.card?.title ?? null,
    fromListId:   e.fromListId,
    fromListName: e.fromList?.name ?? null,
    toListId:     e.toListId,
    toListName:   e.toList?.name ?? null,
  }))
}

async function fetchEvents(boardId: number) {
  return prisma.activityEvent.findMany({
    where:   { boardId },
    orderBy: { createdAt: 'desc' },
    include: activityInclude,
  })
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

  // Query 2: events with all relations via include
  const events = await fetchEvents(boardId)
  res.json(formatEvents(events))
})

// GET /boards/:id/activity/preview — no auth, for testing
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)

  // Single query: events with all relations via include
  const events = await fetchEvents(boardId)
  res.json(formatEvents(events))
})

export default router
