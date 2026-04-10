import { Router } from 'express'
import prisma from '../db'
import { AppError, asyncHandler } from '../errors'
import { toActivityResponse } from '../serializers'
import { parsePositiveInt } from '../validation'

const router = Router()

// GET /boards/:id/activity/preview — no-auth testing endpoint
router.get('/:id/activity/preview', asyncHandler(async (req, res) => {
	const boardId = parsePositiveInt(req.params.id, 'board id')
	const board = await prisma.board.findUnique({ where: { id: boardId }, select: { id: true } })
	if (!board) {
		throw new AppError(404, 'Board not found')
	}

	const events = await prisma.activityEvent.findMany({
		where: { boardId },
		orderBy: { createdAt: 'desc' },
	})

	res.json(events.map(toActivityResponse))
}))

export default router
