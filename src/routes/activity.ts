import { Router, Request, Response, NextFunction } from 'express'
import prisma from '../db'
import { verifyToken } from '../auth'

const router = Router({ mergeParams: true })

function formatEvents(events: Awaited<ReturnType<typeof queryEvents>>) {
  return events.map(e => ({
    id:           e.id,
    boardId:      e.boardId,
    actorId:      e.actor.id,
    actorName:    e.actor.name,
    eventType:    e.eventType,
    cardId:       e.card.id,
    cardTitle:    e.cardTitle,
    fromListName: e.fromListName,
    toListName:   e.toListName,
    timestamp:    e.createdAt,
  }))
}

function queryEvents(boardId: number) {
  return prisma.activityEvent.findMany({
    where: { boardId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id:          true,
      boardId:     true,
      eventType:   true,
      cardTitle:   true,
      fromListName: true,
      toListName:  true,
      createdAt:   true,
      actor:       { select: { id: true, name: true } },
      card:        { select: { id: true, title: true } },
    },
  })
}

// GET /boards/:id/activity — auth required
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const boardId = parseInt(req.params.id)

    const membership = await prisma.boardMember.findUnique({
      where: { userId_boardId: { userId, boardId } },
    })
    if (!membership) {
      res.status(403).json({ error: 'Not a board member' })
      return
    }

    res.json(formatEvents(await queryEvents(boardId)))
  } catch (err) {
    next(err)
  }
})

// GET /boards/:id/activity/preview — no auth, for testing
router.get('/preview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const boardId = parseInt(req.params.id)
    res.json(formatEvents(await queryEvents(boardId)))
  } catch (err) {
    next(err)
  }
})

export default router
