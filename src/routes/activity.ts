import { Router, Request, Response } from 'express'
import { verifyToken } from '../auth'
import { asyncHandler } from '../http'
import { getBoardActivityForUser, getBoardActivityPreview } from '../services/activity-service'
import { idParamSchema, parseWithSchema } from '../validation'

const router = Router()

// GET /boards/:id/activity — authenticated board activity feed
router.get('/:id/activity', asyncHandler(async (req: Request, res: Response) => {
	const userId = verifyToken(req)
	const { id } = parseWithSchema(idParamSchema, req.params)
	const events = await getBoardActivityForUser(userId, id)
	res.json(events)
}))

// GET /boards/:id/activity/preview — no-auth testing endpoint
router.get('/:id/activity/preview', asyncHandler(async (req: Request, res: Response) => {
	const { id } = parseWithSchema(idParamSchema, req.params)
	const events = await getBoardActivityPreview(id)
	res.json(events)
}))

export default router
