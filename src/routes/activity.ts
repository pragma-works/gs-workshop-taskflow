import { Router, Request, Response, NextFunction } from 'express'
import { verifyToken } from '../middleware/auth'
import { ActivityService } from '../services/activityService'

const router = Router()
const activityService = new ActivityService()

// GET /boards/:id/activity
router.get('/:id/activity', async (req: Request, res: Response, next: NextFunction) => {
	try {
		const userId = verifyToken(req)
		const boardId = parseInt(req.params.id, 10)
		const events = await activityService.getBoardActivity(boardId, userId)
		res.json(events)
	} catch (error) {
		next(error)
	}
})

// GET /boards/:id/activity/preview
router.get('/:id/activity/preview', async (req: Request, res: Response, next: NextFunction) => {
	try {
		const boardId = parseInt(req.params.id, 10)
		const events = await activityService.getBoardActivity(boardId)
		res.json(events)
	} catch (error) {
		next(error)
	}
})

export default router
