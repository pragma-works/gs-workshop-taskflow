import { Router } from 'express'

import { asyncRoute, parseIdParameter } from '../http'
import type { UsersService } from '../services/users-service'

export function createUsersRouter(usersService: UsersService): Router {
  const router = Router()

  router.post('/register', asyncRoute(async (request, response) => {
    const user = await usersService.register(request.body)
    response.json(user)
  }))

  router.post('/login', asyncRoute(async (request, response) => {
    const { email, password } = request.body
    const result = await usersService.login(email, password)
    response.json(result)
  }))

  router.get('/:id', asyncRoute(async (request, response) => {
    const userId = parseIdParameter(request.params.id, 'user id')
    const user = await usersService.getById(userId)
    response.json(user)
  }))

  return router
}
