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

function mapActivityEvent(event: {
	id: number
	boardId: number
	actorId: number
	eventType: string
	createdAt: Date
	actor: { name: string }
	card: { title: string } | null
	fromList: { name: string } | null
	toList: { name: string } | null
}) {
	return {
		id: event.id,
		boardId: event.boardId,
		actorId: event.actorId,
		actorName: event.actor.name,
		eventType: event.eventType,
		cardTitle: event.card?.title ?? null,
		fromListName: event.fromList?.name ?? null,
		toListName: event.toList?.name ?? null,
		timestamp: event.createdAt,
	}
}

// GET /boards/:id/activity — authenticated board activity feed
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

	res.json(events.map(mapActivityEvent))
})

// GET /boards/:id/activity/preview — no-auth testing endpoint
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
	const boardId = parseInt(req.params.id)
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

	res.json(events.map(mapActivityEvent))
})

export default router
