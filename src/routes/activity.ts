import { Router, Request, Response } from 'express'
import { verifyToken } from '../auth'
import { asyncHandler } from '../http'
import { getBoardActivityForUser, getBoardActivityPreview } from '../services/activity-service'

const router = Router()

// GET /boards/:id/activity — authenticated board activity feed
router.get('/:id/activity', asyncHandler(async (req: Request, res: Response) => {
	const userId = verifyToken(req)
	const boardId = parseInt(req.params.id)
	const events = await getBoardActivityForUser(userId, boardId)
	res.json(events)
}))

// GET /boards/:id/activity/preview — no-auth testing endpoint
router.get('/:id/activity/preview', asyncHandler(async (req: Request, res: Response) => {
	const boardId = parseInt(req.params.id)
	const events = await getBoardActivityPreview(boardId)
	res.json(events)
}))

export default router
