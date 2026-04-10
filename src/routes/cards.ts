import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../middleware/authenticate'
import { validate } from '../middleware/validate'
import { createCardSchema, moveCardSchema, addCommentSchema } from '../schemas/cards.schema'
import type { CardService } from '../services/cards.service'

export function createCardsRouter(service: CardService) {
  const router = Router()

  router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const card = await service.getCard(parseInt(req.params.id), req.userId!)
      res.json(card)
    } catch (err) {
      next(err)
    }
  })

  router.post('/', authenticate, validate(createCardSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const card = await service.createCard(req.body, req.userId!)
      res.status(201).json(card)
    } catch (err) {
      next(err)
    }
  })

  router.patch('/:id/move', authenticate, validate(moveCardSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await service.moveCard(parseInt(req.params.id), req.body, req.userId!)
      res.json({ ok: true, event: result.event })
    } catch (err) {
      next(err)
    }
  })

  router.post('/:id/comments', authenticate, validate(addCommentSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const comment = await service.addComment({
        content: req.body.content,
        cardId: parseInt(req.params.id),
        userId: req.userId!,
      })
      res.status(201).json(comment)
    } catch (err) {
      next(err)
    }
  })

  router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
      await service.deleteCard(parseInt(req.params.id), req.userId!)
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  })

  return router
}

// Backward-compatible default export wired with concrete repos
import {
  findCardWithDetails,
  createCard,
  moveCardWithActivity,
  addComment,
  deleteCard,
} from '../repositories/cards.repo'
import {
  findBoardsByUser,
  findBoardWithLists,
  isBoardMember,
  createBoard,
  addBoardMember,
} from '../repositories/boards.repo'
import { createCardService } from '../services/cards.service'
import { createBoardService } from '../services/boards.service'

const defaultCardRepo = {
  findWithDetails: findCardWithDetails,
  create: createCard,
  moveWithActivity: moveCardWithActivity,
  addComment,
  delete: deleteCard,
}
const defaultBoardRepo = {
  findByUserId: findBoardsByUser,
  findWithLists: findBoardWithLists,
  isMember: isBoardMember,
  create: createBoard,
  addMember: addBoardMember,
}

export default createCardsRouter(createCardService(defaultCardRepo as any, defaultBoardRepo as any))
