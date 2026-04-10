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

async function fetchBoardActivity(boardId: number) {
  return prisma.activityEvent.findMany({
    where: { boardId },
    orderBy: { createdAt: 'desc' },
    include: {
      actor:    { select: { name: true } },
      card:     { select: { title: true } },
      fromList: { select: { name: true } },
      toList:   { select: { name: true } },
    },
  })
}

type RawEvent = Awaited<ReturnType<typeof fetchBoardActivity>>[number]

function formatEvent(event: RawEvent) {
  const { actor, card, fromList, toList, ...rest } = event
  return {
    ...rest,
    actorName:    actor.name,
    cardTitle:    card?.title     ?? null,
    fromListName: fromList?.name  ?? null,
    toListName:   toList?.name    ?? null,
  }
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

  const events = await fetchBoardActivity(boardId)
  res.json(events.map(formatEvent))
})

// GET /boards/:id/activity/preview — no auth required; for testing
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)
  const events = await fetchBoardActivity(boardId)
  res.json(events.map(formatEvent))
})

export default router
