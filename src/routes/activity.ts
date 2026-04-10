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

function formatEvents(events: Awaited<ReturnType<typeof queryEvents>>) {
  return events.map(e => ({
    id:           e.id,
    boardId:      e.boardId,
    actorId:      e.actorId,
    actorName:    e.actor.name,
    eventType:    e.eventType,
    cardId:       e.cardId,
    cardTitle:    e.card?.title ?? null,
    fromListId:   e.fromListId,
    fromListName: e.fromList?.name ?? null,
    toListId:     e.toListId,
    toListName:   e.toList?.name ?? null,
    timestamp:    e.createdAt,
  }))
}

function queryEvents(boardId: number) {
  return prisma.activityEvent.findMany({
    where:   { boardId },
    orderBy: { createdAt: 'desc' },
    include: {
      actor:    { select: { name: true } },
      card:     { select: { title: true } },
      fromList: { select: { name: true } },
      toList:   { select: { name: true } },
    },
  })
}

// GET /boards/:id/activity — authenticated; at most 2 queries (membership + events)
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

  res.json(formatEvents(await queryEvents(boardId)))
})

// GET /boards/:id/activity/preview — no auth required; 1 query
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)
  res.json(formatEvents(await queryEvents(boardId)))
})

export default router
