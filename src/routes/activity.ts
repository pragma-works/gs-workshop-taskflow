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

async function checkMember(userId: number, boardId: number): Promise<boolean> {
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
  return membership !== null
}

async function fetchBoardActivity(boardId: number) {
  const events = await prisma.activityEvent.findMany({
    where: { boardId },
    orderBy: { timestamp: 'asc' },
    include: { actor: { select: { name: true } } },
  })
  return events.map(e => ({
    id: e.id,
    boardId: e.boardId,
    actorId: e.actorId,
    actorName: e.actor.name,
    eventType: e.eventType,
    cardId: e.cardId,
    cardTitle: e.cardTitle,
    fromListName: e.fromListName,
    toListName: e.toListName,
    timestamp: e.timestamp,
  }))
}

// GET /boards/:id/activity — auth required
router.get('/:id/activity', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const boardId = parseInt(req.params.id)
  const isMember = await checkMember(userId, boardId)
  if (!isMember) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  const activity = await fetchBoardActivity(boardId)
  res.json(activity)
})

// GET /boards/:id/activity/preview — no auth, for testing
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)
  const activity = await fetchBoardActivity(boardId)
  res.json(activity)
})

export default router
