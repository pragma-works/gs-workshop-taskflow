import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../middleware/authenticate'
import type { ActivityService } from '../services/activity.service'

function formatEvent(e: any) {
  return {
    ...e,
    actorName: e.actor?.name ?? null,
    cardTitle: e.card?.title ?? null,
    fromListName: e.fromList?.name ?? null,
    toListName: e.toList?.name ?? null,
  }
}

export function createActivityRouter(service: ActivityService) {
  const router = Router()

  router.get('/:id/activity', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string ?? '1') || 1
      const limit = parseInt(req.query.limit as string ?? '20') || 20
      const events = await service.getBoardActivity(parseInt(req.params.id), req.userId!, { page, limit })
      res.json(events.map(formatEvent))
    } catch (err) {
      next(err)
    }
  })

  router.get('/:id/activity/preview', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const events = await service.getPreview(parseInt(req.params.id))
      res.json(events.map(formatEvent))
    } catch (err) {
      next(err)
    }
  })

  return router
}

// Backward-compatible default export wired with concrete repos
import { getActivityByBoard } from '../repositories/activity.repo'
import {
  findBoardsByUser,
  findBoardWithLists,
  isBoardMember,
  createBoard,
  addBoardMember,
} from '../repositories/boards.repo'
import { createActivityService } from '../services/activity.service'
import { createBoardService } from '../services/boards.service'

const defaultActivityRepo = { getByBoard: getActivityByBoard }
const defaultBoardRepo = {
  findByUserId: findBoardsByUser,
  findWithLists: findBoardWithLists,
  isMember: isBoardMember,
  create: createBoard,
  addMember: addBoardMember,
}

export default createActivityRouter(createActivityService(defaultActivityRepo as any, defaultBoardRepo as any))
