import { Router } from 'express'

import { verifyToken } from '../lib/auth'
import { asyncHandler } from '../lib/asyncHandler'
import { HttpError, getErrorMessage } from '../lib/errors'
import {
  parseIdParam,
  parseNonNegativeInt,
  parseOptionalPositiveInt,
  parseOptionalString,
  parsePositiveInt,
  parseRequiredString,
  readObjectBody,
} from '../lib/validation'
import {
  createCardAtEnd,
  createComment,
  deleteCardById,
  findCardForMove,
  findCardWithDetails,
  findListById,
  moveCardWithActivity,
} from '../repositories/cardsRepository'
import { isBoardMember } from '../repositories/boardsRepository'

const router = Router()

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    verifyToken(req)
    const cardId = parseIdParam(req.params.id, 'card id')
    const card = await findCardWithDetails(cardId)
    if (!card) {
      throw new HttpError(404, 'Not found')
    }

    res.json(card)
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    verifyToken(req)
    const body = readObjectBody(req.body)
    const title = parseRequiredString(body.title, 'title')
    const description = parseOptionalString(body.description, 'description')
    const listId = parsePositiveInt(body.listId, 'listId')
    const assigneeId = parseOptionalPositiveInt(body.assigneeId, 'assigneeId')
    const card = await createCardAtEnd({ title, description, listId, assigneeId })
    res.status(201).json(card)
  }),
)

router.patch(
  '/:id/move',
  asyncHandler(async (req, res) => {
    const userId = verifyToken(req)
    const cardId = parseIdParam(req.params.id, 'card id')
    const body = readObjectBody(req.body)
    const targetListId = parsePositiveInt(body.targetListId, 'targetListId')
    const position = parseNonNegativeInt(body.position, 'position')

    const card = await findCardForMove(cardId)
    if (!card) {
      throw new HttpError(404, 'Not found')
    }

    if (!(await isBoardMember(userId, card.list.boardId))) {
      throw new HttpError(403, 'Not a board member')
    }

    const targetList = await findListById(targetListId)
    if (!targetList || targetList.boardId !== card.list.boardId) {
      throw new HttpError(404, 'Not found')
    }

    try {
      const event = await moveCardWithActivity({
        cardId,
        boardId: card.list.boardId,
        actorId: userId,
        fromListId: card.listId,
        targetListId,
        position,
      })

      res.json({ ok: true, event })
    } catch (error: unknown) {
      res.status(500).json({
        error: 'Move failed',
        details: getErrorMessage(error),
      })
    }
  }),
)

router.post(
  '/:id/comments',
  asyncHandler(async (req, res) => {
    const userId = verifyToken(req)
    const body = readObjectBody(req.body)
    const content = parseRequiredString(body.content, 'content')
    const cardId = parseIdParam(req.params.id, 'card id')
    const comment = await createComment({ content, cardId, userId })
    res.status(201).json(comment)
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    verifyToken(req)
    const cardId = parseIdParam(req.params.id, 'card id')
    await deleteCardById(cardId)
    res.json({ ok: true })
  }),
)

export default router
