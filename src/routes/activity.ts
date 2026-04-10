import { Router, Request, Response } from 'express'
import prisma from '../db'
import { requireAuth } from '../middleware/auth'

const router = Router()

async function getBoardActivity(boardId: number) {
  const events = await prisma.activityEvent.findMany({
	where: { boardId },
	orderBy: { createdAt: 'desc' },
	include: {
	  actor: { select: { name: true } },
	  card: { select: { title: true } },
	  fromList: { select: { name: true } },
	  toList: { select: { name: true } },
	},
  })

  return events.map((event) => ({
	...event,
	actorName: event.actor.name,
	cardTitle: event.card?.title ?? null,
	fromListName: event.fromList?.name ?? null,
	toListName: event.toList?.name ?? null,
  }))
}

// GET /boards/:id/activity — authenticated board feed
router.get('/:id/activity', requireAuth, async (req: Request, res: Response) => {
  const userId = req.userId as number

  const boardId = parseInt(req.params.id)
  if (Number.isNaN(boardId)) {
    res.status(400).json({ error: 'Invalid board id' })
    return
  }

  const membership = await prisma.boardMember.findUnique({
	where: { userId_boardId: { userId, boardId } },
  })
  if (!membership) {
	res.status(403).json({ error: 'Not a board member' })
	return
  }

  const events = await getBoardActivity(boardId)
  res.json(events)
})

// GET /boards/:id/activity/preview — no-auth testing endpoint
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)
  if (Number.isNaN(boardId)) {
    res.status(400).json({ error: 'Invalid board id' })
    return
  }

  const events = await getBoardActivity(boardId)
  res.json(events)
})

export default router
