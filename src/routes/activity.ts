import { Router, type RequestHandler } from 'express'
import { getAuthenticatedUserId } from '../middleware/authenticate-request'
import type { ActivityService } from '../services/activity-service'
import { asyncRouteHandler } from './async-route-handler'
import { parseIntegerParameter } from './request-parsing'

/** Creates board activity feed routes. */
export function createActivityRouter(
  activityService: ActivityService,
  authenticatedRoute: RequestHandler,
): Router {
  const router = Router()

  router.get(
    '/:id/activity/preview',
    asyncRouteHandler(async (request, response) => {
      const events = await activityService.getBoardActivityPreview(
        parseIntegerParameter(request.params.id, 'boardId'),
      )

      response.json({ events })
    }),
  )

  router.get(
    '/:id/activity',
    authenticatedRoute,
    asyncRouteHandler(async (request, response) => {
      const events = await activityService.getBoardActivity(
        getAuthenticatedUserId(request),
        parseIntegerParameter(request.params.id, 'boardId'),
      )

      response.json({ events })
    }),
  )

  return router
}
