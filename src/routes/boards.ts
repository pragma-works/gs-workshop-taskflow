import { Router } from 'express'

import type { TokenService } from '../auth'
import { authenticatedRoute, parseIdParameter } from '../http'
import type { BoardsService } from '../services/boards-service'

export function createBoardsRouter(
  boardsService: BoardsService,
  tokenService: TokenService,
): Router {
  const router = Router()

  router.get('/', authenticatedRoute(tokenService, async (_request, response, authenticatedUserId) => {
    const boards = await boardsService.listForUser(authenticatedUserId)
    response.json(boards)
  }))

  router.get('/:id', authenticatedRoute(tokenService, async (request, response, authenticatedUserId) => {
    const boardId = parseIdParameter(request.params.id, 'board id')
    const board = await boardsService.getById(boardId, authenticatedUserId)
    response.json(board)
  }))

  router.post('/', authenticatedRoute(tokenService, async (request, response, authenticatedUserId) => {
    const board = await boardsService.create(request.body.name, authenticatedUserId)
    response.status(201).json(board)
  }))

  router.post('/:id/members', authenticatedRoute(tokenService, async (request, response, authenticatedUserId) => {
    const boardId = parseIdParameter(request.params.id, 'board id')
    await boardsService.addMember(boardId, authenticatedUserId, request.body.memberId)
    response.status(201).json({ ok: true })
  }))

  return router
}
