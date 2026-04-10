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

// GET /boards/:id/activity — authenticated activity feed
router.get('/:id/activity', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const boardId = parseInt(req.params.id)

  // Query 1: Check membership
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } }
  })

  if (!membership) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  // Query 2: Fetch all events with relations in a single query
  const events = await prisma.activityEvent.findMany({
    where: { boardId },
    include: {
      actor: { select: { name: true } },
      card: { select: { title: true } },
      fromList: { select: { name: true } },
      toList: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  const formattedEvents = events.map(event => ({
    ...event,
    actorName: event.actor.name,
    cardTitle: event.card?.title ?? null,
    fromListName: event.fromList?.name ?? null,
    toListName: event.toList?.name ?? null
  }))

  res.json(formattedEvents)
})

// GET /boards/:id/activity/preview — no-auth testing endpoint
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)

  // Query 1: Fetch all events with relations in a single query
  const events = await prisma.activityEvent.findMany({
    where: { boardId },
    include: {
      actor: { select: { name: true } },
      card: { select: { title: true } },
      fromList: { select: { name: true } },
      toList: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  const formattedEvents = events.map(event => ({
    ...event,
    actorName: event.actor.name,
    cardTitle: event.card?.title ?? null,
    fromListName: event.fromList?.name ?? null,
    toListName: event.toList?.name ?? null
  }))

  res.json(formattedEvents)
})

export default router
