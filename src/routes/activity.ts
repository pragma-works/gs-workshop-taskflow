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

async function getActivityEvents(boardId: number) {
  const events = await prisma.activityEvent.findMany({
    where: { boardId },
    orderBy: { createdAt: 'desc' },
    include: {
      actor: true,
      card: true,
      fromList: true,
      toList: true,
    },
  })

  return events.map(({ actor, card, fromList, toList, ...event }) => ({
    ...event,
    actorName: actor.name,
    cardTitle: card?.title ?? null,
    fromListName: fromList?.name ?? null,
    toListName: toList?.name ?? null,
  }))
}

// GET /boards/:id/activity/preview — no-auth testing endpoint
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)
  const events = await getActivityEvents(boardId)
  res.json(events)
})

// GET /boards/:id/activity — chronological log of card moves and comments on this board
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

  const events = await getActivityEvents(boardId)
  res.json(events)
})

export default router
