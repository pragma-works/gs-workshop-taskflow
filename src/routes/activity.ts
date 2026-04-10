import { Router, Request, Response } from 'express'
import * as jwt from 'jsonwebtoken'
import prisma from '../db'

const router = Router()

// Auth helper
function verifyToken(req: Request): number {
  const header = req.headers.authorization
  if (!header) throw new Error('No auth header')
  const token = header.replace('Bearer ', '')
  const payload = jwt.verify(token, 'super-secret-key-change-me') as { userId: number }
  return payload.userId
}

// Membership check helper
async function checkMember(userId: number, boardId: number): Promise<boolean> {
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
  return membership !== null
}

// Helper to fetch activity events with all related data in a single query
async function getActivityEventsForBoard(boardId: number) {
  const events = await prisma.activityEvent.findMany({
    where: { boardId },
    include: {
      actor: { select: { id: true, name: true } },
      card: { select: { id: true, title: true } },
      fromList: { select: { id: true, name: true } },
      toList: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Map to response format with nullable fields
  return events.map((event) => ({
    id: event.id,
    boardId: event.boardId,
    actorId: event.actorId,
    actorName: event.actor.name,
    eventType: event.eventType,
    cardId: event.cardId,
    cardTitle: event.card?.title ?? null,
    fromListId: event.fromListId,
    fromListName: event.fromList?.name ?? null,
    toListId: event.toListId,
    toListName: event.toList?.name ?? null,
    createdAt: event.createdAt,
  }))
}

// GET /boards/:id/activity — authenticated; returns activity events for board
router.get('/:id/activity', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const boardId = parseInt(req.params.id)

  // Membership check (1st query)
  const isMember = await checkMember(userId, boardId)
  if (!isMember) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  // Fetch events with all relations (2nd query, but actually 1 since membership is separate)
  const events = await getActivityEventsForBoard(boardId)
  res.json(events)
})

// GET /boards/:id/activity/preview — no auth required; returns activity events for board
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)

  // Fetch events with all relations (1 query)
  const events = await getActivityEventsForBoard(boardId)
  res.json(events)
})

export default router
