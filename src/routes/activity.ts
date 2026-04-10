import { Router, Request, Response, NextFunction } from 'express'
import { verifyToken } from '../auth'
import { ActivityService } from '../services/ActivityService'
import { PrismaActivityRepository } from '../repositories/PrismaActivityRepository'
import { PrismaBoardMemberRepository } from '../repositories/PrismaBoardMemberRepository'

const router = Router({ mergeParams: true })

// Manual dependency injection — no container needed at this scale.
const service = new ActivityService(
  new PrismaActivityRepository(),
  new PrismaBoardMemberRepository(),
)

// GET /boards/:id/activity — auth + membership required
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
    res.json(await service.getForBoard(boardId, userId))
  } catch (err) {
    next(err) // AppError subclasses are mapped by the global handler
  }
})

// GET /boards/:id/activity/preview — no auth
router.get('/preview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const boardId = parseInt(req.params.id)
    res.json(await service.getPreview(boardId))
  } catch (err) {
    next(err)
  }
})

export default router
