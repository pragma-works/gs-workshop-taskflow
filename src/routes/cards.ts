import { Router } from 'express'
import type { TokenService } from '../auth/token-service'
import {
  authenticateRequest,
  getAuthenticatedUserId,
} from '../middleware/authenticate-request'
import type { CardsService } from '../services/cards-service'
import { asyncRouteHandler } from './async-route-handler'
import {
  optionalInteger,
  optionalString,
  parseIntegerParameter,
  requireInteger,
  requireNonEmptyString,
} from './request-parsing'

/** Creates card routes backed by the cards service. */
export function createCardsRouter(cardsService: CardsService, tokenService: TokenService): Router {
  const router = Router()
  router.use(authenticateRequest(tokenService))

  router.get(
    '/:id',
    asyncRouteHandler(async (request, response) => {
      const card = await cardsService.getCard(
        getAuthenticatedUserId(request),
        parseIntegerParameter(request.params.id, 'cardId'),
      )

      response.json(card)
    }),
  )

  router.post(
    '/',
    asyncRouteHandler(async (request, response) => {
      const card = await cardsService.createCard(getAuthenticatedUserId(request), {
        assigneeId: optionalInteger(request.body?.assigneeId, 'assigneeId'),
        description: optionalString(request.body?.description, 'description'),
        listId: requireInteger(request.body?.listId, 'listId'),
        title: requireNonEmptyString(request.body?.title, 'title'),
      })

      response.status(201).json(card)
    }),
  )

  router.patch(
    '/:id/move',
    asyncRouteHandler(async (request, response) => {
      await cardsService.moveCard(
        getAuthenticatedUserId(request),
        parseIntegerParameter(request.params.id, 'cardId'),
        {
          position: requireInteger(request.body?.position, 'position'),
          targetListId: requireInteger(request.body?.targetListId, 'targetListId'),
        },
      )

      response.json({ ok: true })
    }),
  )

  router.post(
    '/:id/move',
    asyncRouteHandler(async (request, response) => {
      await cardsService.moveCard(
        getAuthenticatedUserId(request),
        parseIntegerParameter(request.params.id, 'cardId'),
        {
          position: requireInteger(request.body?.position, 'position'),
          targetListId: requireInteger(request.body?.targetListId, 'targetListId'),
        },
      )

      response.json({ ok: true })
    }),
  )

  router.post(
    '/:id/comments',
    asyncRouteHandler(async (request, response) => {
      const comment = await cardsService.addComment(
        getAuthenticatedUserId(request),
        parseIntegerParameter(request.params.id, 'cardId'),
        { content: requireNonEmptyString(request.body?.content, 'content') },
      )

      response.status(201).json(comment)
    }),
  )

  router.delete(
    '/:id',
    asyncRouteHandler(async (request, response) => {
      await cardsService.deleteCard(
        getAuthenticatedUserId(request),
        parseIntegerParameter(request.params.id, 'cardId'),
      )

      response.json({ ok: true })
    }),
  )

  return router
}
