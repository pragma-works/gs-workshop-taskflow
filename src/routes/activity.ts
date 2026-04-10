import { Router } from 'express'

import { verifyToken } from '../lib/auth'
import { asyncHandler } from '../lib/asyncHandler'
import { HttpError } from '../lib/errors'
import { parseIdParam } from '../lib/validation'
import { listBoardActivity } from '../repositories/activityRepository'
import { isBoardMember } from '../repositories/boardsRepository'

const router = Router()

router.get(
  '/:id/activity',
  asyncHandler(async (req, res) => {
    const userId = verifyToken(req)
    const boardId = parseIdParam(req.params.id, 'board id')

    if (!(await isBoardMember(userId, boardId))) {
      throw new HttpError(403, 'Not a board member')
    }

    res.json(await listBoardActivity(boardId))
  }),
)

router.get(
  '/:id/activity/preview',
  asyncHandler(async (req, res) => {
    const boardId = parseIdParam(req.params.id, 'board id')
    res.json(await listBoardActivity(boardId))
  }),
)

export default router
