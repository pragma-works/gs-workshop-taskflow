import { Router, Request, Response } from 'express'
import * as jwt from 'jsonwebtoken'
import prisma from '../db'

const router = Router()

// Auth helper (shared with boards.ts and cards.ts for now)
function verifyToken(req: Request): number {
  const header = req.headers.authorization
  if (!header) throw new Error('No auth header')
  const token = header.replace('Bearer ', '')
  const payload = jwt.verify(token, 'super-secret-key-change-me') as { userId: number }
  return payload.userId
}

// GET /boards/:id/activity — authenticated activity feed with efficient single query
router.get('/:id/activity', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const boardId = parseInt(req.params.id)

  try {
    // Query 1: Check membership
    const isMember = await prisma.boardMember.findUnique({
      where: { userId_boardId: { userId, boardId } },
    })
    if (!isMember) {
      res.status(403).json({ error: 'Not a board member' })
      return
    }

    // Query 2: Fetch all events with relations in a single query
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

    // Transform to match expected shape: include nested names as top-level fields
    const result = events.map((event) => ({
      id: event.id,
      boardId: event.boardId,
      actorId: event.actorId,
      actorName: event.actor.name,
      eventType: event.eventType,
      cardId: event.cardId,
      cardTitle: event.card?.title ?? null,
      fromListName: event.fromList?.name ?? null,
      toListName: event.toList?.name ?? null,
      timestamp: event.createdAt,
    }))

    res.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: 'Failed to fetch activity', details: message })
  }
})

// GET /boards/:id/activity/preview — no-auth activity feed (same shape)
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)

  try {
    // Single query: fetch all events with relations
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

    // Same transformation as authenticated endpoint
    const result = events.map((event) => ({
      id: event.id,
      boardId: event.boardId,
      actorId: event.actorId,
      actorName: event.actor.name,
      eventType: event.eventType,
      cardId: event.cardId,
      cardTitle: event.card?.title ?? null,
      fromListName: event.fromList?.name ?? null,
      toListName: event.toList?.name ?? null,
      timestamp: event.createdAt,
    }))

    res.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: 'Failed to fetch activity', details: message })
  }
})

export default router
