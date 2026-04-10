import { Router, Request, Response } from 'express'
import { getAuthenticatedUserId, requireAuth } from '../middleware/auth'
import { type ActivityService } from '../services/activity-service'
import { withRouteErrorHandling } from './route-errors'

interface ActivityRouterDependencies {
  activityService: ActivityService
}

/**
 * Creates the activity router and wires activity feed use cases to HTTP endpoints.
 *
 * @param {ActivityRouterDependencies} dependencies - Activity use cases required by the router.
 * @returns {Router} Configured activity router.
 */
export function createActivityRouter({ activityService }: ActivityRouterDependencies): Router {
  const router = Router()

  router.get(
    '/:id/activity/preview',
    withRouteErrorHandling(async (req: Request, res: Response) => {
      const preview = await activityService.getBoardActivityPreview(parseInt(req.params.id))
      res.json(preview)
    }),
  )

  router.get(
    '/:id/activity',
    requireAuth,
    withRouteErrorHandling(async (req: Request, res: Response) => {
      const activity = await activityService.getBoardActivity(
        getAuthenticatedUserId(req),
        parseInt(req.params.id),
      )
      res.json(activity)
    }),
  )

  return router
}

export default createActivityRouter
