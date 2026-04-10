import { Router } from 'express'
import type { TokenService } from '../auth/token-service'
import {
  authenticateRequest,
  getAuthenticatedUserId,
} from '../middleware/authenticate-request'
import type { BoardsService } from '../services/boards-service'
import { asyncRouteHandler } from './async-route-handler'
import { parseIntegerParameter, requireInteger, requireNonEmptyString } from './request-parsing'

/** Creates board routes backed by the boards service. */
export function createBoardsRouter(boardsService: BoardsService, tokenService: TokenService): Router {
  const router = Router()
  router.use(authenticateRequest(tokenService))

  router.get(
    '/',
    asyncRouteHandler(async (request, response) => {
      const boards = await boardsService.listBoardsForUser(getAuthenticatedUserId(request))
      response.json(boards)
    }),
  )

  router.get(
    '/:id',
    asyncRouteHandler(async (request, response) => {
      const board = await boardsService.getBoardById(
        getAuthenticatedUserId(request),
        parseIntegerParameter(request.params.id, 'boardId'),
      )

      response.json(board)
    }),
  )

  router.post(
    '/',
    asyncRouteHandler(async (request, response) => {
      const board = await boardsService.createBoard(getAuthenticatedUserId(request), {
        name: requireNonEmptyString(request.body?.name, 'name'),
      })

      response.status(201).json(board)
    }),
  )

  router.post(
    '/:id/members',
    asyncRouteHandler(async (request, response) => {
      await boardsService.addMemberToBoard(
        getAuthenticatedUserId(request),
        parseIntegerParameter(request.params.id, 'boardId'),
        { memberId: requireInteger(request.body?.memberId, 'memberId') },
      )

      response.status(201).json({ ok: true })
    }),
  )

  return router
}
