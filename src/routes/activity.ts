import { Router, Request, Response } from 'express'
import * as jwt from 'jsonwebtoken'
import {
  checkMembership,
  findBoardEvents,
  ActivityEventWithRelations,
} from '../repositories/activityRepo'

const router = Router()

function verifyToken(req: Request): number {
  const header = req.headers.authorization
  if (!header) throw new Error('No auth header')
  const token = header.replace('Bearer ', '')
  const payload = jwt.verify(token, 'super-secret-key-change-me') as { userId: number }
  return payload.userId
}

function formatEvents(events: ActivityEventWithRelations[]) {
  return events.map(e => ({
    id:           e.id,
    boardId:      e.boardId,
    actorId:      e.actorId,
    actorName:    e.actor.name,
    eventType:    e.eventType,
    cardId:       e.cardId,
    cardTitle:    e.card?.title    ?? null,
    fromListId:   e.fromListId,
    fromListName: e.fromList?.name ?? null,
    toListId:     e.toListId,
    toListName:   e.toList?.name   ?? null,
    createdAt:    e.createdAt,
  }))
}

// GET /boards/:id/activity — authenticated; membership-gated
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
  const membership = await checkMembership(userId, boardId)
  if (!membership) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  // Query 2: all events with relations in a single round-trip (no loops)
  const events = await findBoardEvents(boardId)
  res.json(formatEvents(events))
})

// GET /boards/:id/activity/preview — no auth; for testing
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)

  // Single query: events with all relations in one round-trip (no loops)
  const events = await findBoardEvents(boardId)
  res.json(formatEvents(events))
})

export default router
