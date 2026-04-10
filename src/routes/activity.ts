import { Router, Request, Response } from 'express'
import prisma from '../db'
import { verifyToken } from '../auth'

const router = Router({ mergeParams: true })

// GET /boards/:id/activity — chronological feed of card moves for a board
router.get('/', async (req: Request, res: Response) => {
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

  const events = await prisma.activityEvent.findMany({
    where: { boardId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id:        true,
      type:      true,
      payload:   true,
      createdAt: true,
      actor:     { select: { id: true, name: true } },
      card:      { select: { id: true, title: true } },
    },
  })

  res.json(events.map(e => ({ ...e, payload: JSON.parse(e.payload) })))
})

export default router
