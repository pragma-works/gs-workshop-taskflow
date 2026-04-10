import { Router } from 'express'

import type { TokenService } from '../auth'
import { authenticatedRoute, asyncRoute, parseIdParameter } from '../http'
import type { ActivityService } from '../services/activity-service'

export function createActivityRouter(
  activityService: ActivityService,
  tokenService: TokenService,
): Router {
  const router = Router()

  router.get('/:id/activity', authenticatedRoute(tokenService, async (request, response, authenticatedUserId) => {
    const boardId = parseIdParameter(request.params.id, 'board id')
    const events = await activityService.getBoardActivity(boardId, authenticatedUserId)
    response.json(events)
  }))

  router.get('/:id/activity/preview', asyncRoute(async (request, response) => {
    const boardId = parseIdParameter(request.params.id, 'board id')
    const events = await activityService.getBoardActivityPreview(boardId)
    response.json(events)
  }))

  return router
}
