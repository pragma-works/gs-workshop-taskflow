import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../middleware/authenticate'
import { validate } from '../middleware/validate'
import { createBoardSchema, addMemberSchema } from '../schemas/boards.schema'
import type { BoardService } from '../services/boards.service'

export function createBoardsRouter(service: BoardService) {
  const router = Router()

  router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const boards = await service.getUserBoards(req.userId!)
      res.json(boards)
    } catch (err) {
      next(err)
    }
  })

  router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const board = await service.getBoard(parseInt(req.params.id), req.userId!)
      res.json(board)
    } catch (err) {
      next(err)
    }
  })

  router.post('/', authenticate, validate(createBoardSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const board = await service.createBoard(req.body.name, req.userId!)
      res.status(201).json(board)
    } catch (err) {
      next(err)
    }
  })

  router.post('/:id/members', authenticate, validate(addMemberSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      await service.addMember(parseInt(req.params.id), req.body.memberId, req.userId!)
      res.status(201).json({ ok: true })
    } catch (err) {
      next(err)
    }
  })

  return router
}

// Backward-compatible default export wired with concrete repos
import {
  findBoardsByUser,
  findBoardWithLists,
  isBoardMember,
  createBoard,
  addBoardMember,
} from '../repositories/boards.repo'
import { createBoardService } from '../services/boards.service'

const defaultRepo = {
  findByUserId: findBoardsByUser,
  findWithLists: findBoardWithLists,
  isMember: isBoardMember,
  create: createBoard,
  addMember: addBoardMember,
}

export default createBoardsRouter(createBoardService(defaultRepo as any))
