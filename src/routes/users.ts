import { Router, Request, Response } from 'express'
import { type UserService } from '../services/user-service'
import { withRouteErrorHandling } from './route-errors'

interface UsersRouterDependencies {
  userService: UserService
}

/**
 * Creates the users router and wires user use cases to HTTP endpoints.
 *
 * @param {UsersRouterDependencies} dependencies - User use cases required by the router.
 * @returns {Router} Configured users router.
 */
export function createUsersRouter({ userService }: UsersRouterDependencies): Router {
  const router = Router()

  router.post(
    '/register',
    withRouteErrorHandling(async (req: Request, res: Response) => {
      const user = await userService.registerUser(req.body)
      res.json(user)
    }),
  )

  router.post(
    '/login',
    withRouteErrorHandling(async (req: Request, res: Response) => {
      const result = await userService.loginUser(req.body)
      res.json(result)
    }),
  )

  router.get(
    '/:id',
    withRouteErrorHandling(async (req: Request, res: Response) => {
      const user = await userService.getUserById(parseInt(req.params.id))
      res.json(user)
    }),
  )

  return router
}

export default createUsersRouter
