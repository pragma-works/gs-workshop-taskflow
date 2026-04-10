import { Router } from 'express'

import { verifyToken } from '../lib/auth'
import { asyncHandler } from '../lib/asyncHandler'
import { HttpError } from '../lib/errors'
import { parseIdParam, parsePositiveInt, parseRequiredString, readObjectBody } from '../lib/validation'
import {
  addBoardMember,
  createBoardWithOwner,
  findBoardWithDetails,
  isBoardMember,
  isBoardOwner,
  listBoardsForUser,
} from '../repositories/boardsRepository'

const router = Router()

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = verifyToken(req)
    res.json(await listBoardsForUser(userId))
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = verifyToken(req)
    const boardId = parseIdParam(req.params.id, 'board id')

    if (!(await isBoardMember(userId, boardId))) {
      throw new HttpError(403, 'Not a board member')
    }

    const board = await findBoardWithDetails(boardId)
    if (!board) {
      throw new HttpError(404, 'Board not found')
    }

    res.json(board)
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const userId = verifyToken(req)
    const body = readObjectBody(req.body)
    const name = parseRequiredString(body.name, 'name')
    const board = await createBoardWithOwner(name, userId)
    res.status(201).json(board)
  }),
)

router.post(
  '/:id/members',
  asyncHandler(async (req, res) => {
    const userId = verifyToken(req)
    const boardId = parseIdParam(req.params.id, 'board id')
    const body = readObjectBody(req.body)
    const memberId = parsePositiveInt(body.memberId, 'memberId')

    if (!(await isBoardOwner(userId, boardId))) {
      throw new HttpError(403, 'Only board owners can add members')
    }

    await addBoardMember(boardId, memberId)
    res.status(201).json({ ok: true })
  }),
)

export default router
