import { Router } from 'express'
import { asyncRouteHandler } from './async-route-handler'
import { parseIntegerParameter, requireNonEmptyString } from './request-parsing'
import type { UsersService } from '../services/users-service'

/** Creates user routes backed by the users service. */
export function createUsersRouter(usersService: UsersService): Router {
  const router = Router()

  router.post(
    '/register',
    asyncRouteHandler(async (request, response) => {
      const user = await usersService.registerUser({
        email: requireNonEmptyString(request.body?.email, 'email'),
        name: requireNonEmptyString(request.body?.name, 'name'),
        password: requireNonEmptyString(request.body?.password, 'password'),
      })

      response.json(user)
    }),
  )

  router.post(
    '/login',
    asyncRouteHandler(async (request, response) => {
      const result = await usersService.loginUser({
        email: requireNonEmptyString(request.body?.email, 'email'),
        password: requireNonEmptyString(request.body?.password, 'password'),
      })

      response.json(result)
    }),
  )

  router.get(
    '/:id',
    asyncRouteHandler(async (request, response) => {
      const user = await usersService.getUserById(
        parseIntegerParameter(request.params.id, 'userId'),
      )

      response.json(user)
    }),
  )

  return router
}
