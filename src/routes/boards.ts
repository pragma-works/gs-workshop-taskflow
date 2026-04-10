import { Router, Request, Response } from 'express'
import { getAuthenticatedUserId, requireAuth } from '../middleware/auth'
import { type BoardService } from '../services/board-service'
import { withRouteErrorHandling } from './route-errors'

interface BoardsRouterDependencies {
  boardService: BoardService
}

/**
 * Creates the boards router and wires board use cases to HTTP endpoints.
 *
 * @param {BoardsRouterDependencies} dependencies - Board use cases required by the router.
 * @returns {Router} Configured boards router.
 */
export function createBoardsRouter({ boardService }: BoardsRouterDependencies): Router {
  const router = Router()

  router.get(
    '/',
    requireAuth,
    withRouteErrorHandling(async (req: Request, res: Response) => {
      const boards = await boardService.listBoards(getAuthenticatedUserId(req))
      res.json(boards)
    }),
  )

  router.get(
    '/:id',
    requireAuth,
    withRouteErrorHandling(async (req: Request, res: Response) => {
      const board = await boardService.getBoard(getAuthenticatedUserId(req), parseInt(req.params.id))
      res.json(board)
    }),
  )

  router.post(
    '/',
    requireAuth,
    withRouteErrorHandling(async (req: Request, res: Response) => {
      const board = await boardService.createBoard(getAuthenticatedUserId(req), req.body.name)
      res.status(201).json(board)
    }),
  )

  router.post(
    '/:id/members',
    requireAuth,
    withRouteErrorHandling(async (req: Request, res: Response) => {
      await boardService.addMember(
        getAuthenticatedUserId(req),
        parseInt(req.params.id),
        req.body.memberId,
      )
      res.status(201).json({ ok: true })
    }),
  )

  return router
}

export default createBoardsRouter
