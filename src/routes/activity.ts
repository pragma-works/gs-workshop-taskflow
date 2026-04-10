import { Router, Response } from 'express'
import { z } from 'zod'
import { AuthRequest, requireAuth } from '../middleware/auth'
import { validateParams } from '../middleware/validation'
import { activityService } from '../services/activityService'

const router = Router()

const idParamSchema = z.object({ id: z.coerce.number().int().positive() })

// GET /boards/:id/activity — authenticated; returns all ActivityEvents for the board
router.get('/:id/activity', requireAuth, validateParams(idParamSchema), async (req: AuthRequest, res: Response) => {
  const userId = req.userId as number

  const boardId = Number(req.params.id)

  const result = await activityService.getBoardActivityForMember(userId, boardId)
  if (result.forbidden) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  res.json(result.events)
})

// GET /boards/:id/activity/preview — no auth required; for testing
router.get('/:id/activity/preview', validateParams(idParamSchema), async (req: AuthRequest, res: Response) => {
  const boardId = Number(req.params.id)

  const events = await activityService.getBoardActivity(boardId)
  res.json(events)
})

export default router
