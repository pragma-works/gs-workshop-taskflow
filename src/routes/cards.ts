import { Router, Request, Response } from 'express'
import { getAuthenticatedUserId, requireAuth } from '../middleware/auth'
import { type CardService } from '../services/card-service'
import { withRouteErrorHandling } from './route-errors'

interface CardsRouterDependencies {
  cardService: CardService
}

/**
 * Creates the cards router and wires card use cases to HTTP endpoints.
 *
 * @param {CardsRouterDependencies} dependencies - Card use cases required by the router.
 * @returns {Router} Configured cards router.
 */
export function createCardsRouter({ cardService }: CardsRouterDependencies): Router {
  const router = Router()

  router.get(
    '/:id',
    requireAuth,
    withRouteErrorHandling(async (req: Request, res: Response) => {
      const card = await cardService.getCard(getAuthenticatedUserId(req), parseInt(req.params.id))
      res.json(card)
    }),
  )

  router.post(
    '/',
    requireAuth,
    withRouteErrorHandling(async (req: Request, res: Response) => {
      const card = await cardService.createCard({
        userId: getAuthenticatedUserId(req),
        title: req.body.title,
        description: req.body.description,
        listId: req.body.listId,
        assigneeId: req.body.assigneeId,
      })
      res.status(201).json(card)
    }),
  )

  router.patch(
    '/:id/move',
    requireAuth,
    withRouteErrorHandling(async (req: Request, res: Response) => {
      const updatedCard = await cardService.moveCard({
        userId: getAuthenticatedUserId(req),
        cardId: parseInt(req.params.id),
        targetListId: req.body.targetListId,
        position: req.body.position,
      })
      res.json(updatedCard)
    }),
  )

  router.post(
    '/:id/comments',
    requireAuth,
    withRouteErrorHandling(async (req: Request, res: Response) => {
      const comment = await cardService.addComment({
        userId: getAuthenticatedUserId(req),
        cardId: parseInt(req.params.id),
        content: req.body.content,
      })
      res.status(201).json(comment)
    }),
  )

  router.delete(
    '/:id',
    requireAuth,
    withRouteErrorHandling(async (req: Request, res: Response) => {
      await cardService.deleteCard({
        userId: getAuthenticatedUserId(req),
        cardId: parseInt(req.params.id),
      })
      res.json({ ok: true })
    }),
  )

  return router
}

export default createCardsRouter
