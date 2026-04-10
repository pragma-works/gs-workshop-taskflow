import { Router } from 'express'

import type { TokenService } from '../auth'
import { authenticatedRoute, parseIdParameter } from '../http'
import type { CardsService } from '../services/cards-service'

export function createCardsRouter(
  cardsService: CardsService,
  tokenService: TokenService,
): Router {
  const router = Router()

  router.get('/:id', authenticatedRoute(tokenService, async (request, response, authenticatedUserId) => {
    const cardId = parseIdParameter(request.params.id, 'card id')
    const card = await cardsService.getById(cardId, authenticatedUserId)
    response.json(card)
  }))

  router.post('/', authenticatedRoute(tokenService, async (request, response, authenticatedUserId) => {
    const card = await cardsService.create(request.body, authenticatedUserId)
    response.status(201).json(card)
  }))

  const moveCardHandler = authenticatedRoute(tokenService, async (request, response, authenticatedUserId) => {
    const cardId = parseIdParameter(request.params.id, 'card id')
    const result = await cardsService.move({
      cardId,
      targetListId: request.body.targetListId,
      position: request.body.position,
    }, authenticatedUserId)
    response.json(result)
  })

  router.patch('/:id/move', moveCardHandler)
  router.post('/:id/move', moveCardHandler)

  router.post('/:id/comments', authenticatedRoute(tokenService, async (request, response, authenticatedUserId) => {
    const cardId = parseIdParameter(request.params.id, 'card id')
    const comment = await cardsService.addComment({
      cardId,
      content: request.body.content,
    }, authenticatedUserId)
    response.status(201).json(comment)
  }))

  router.delete('/:id', authenticatedRoute(tokenService, async (request, response, authenticatedUserId) => {
    const cardId = parseIdParameter(request.params.id, 'card id')
    await cardsService.delete(cardId, authenticatedUserId)
    response.json({ ok: true })
  }))

  return router
}
