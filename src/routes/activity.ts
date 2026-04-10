import { Router } from 'express'

import { verifyToken } from '../lib/auth'
import { asyncHandler } from '../lib/asyncHandler'
import { HttpError } from '../lib/errors'
import { isBoardMember, listBoardActivity } from '../repositories/taskflowRepository'

const router = Router()

router.get(
  '/:id/activity',
  asyncHandler(async (req, res) => {
    const userId = verifyToken(req)
    const boardId = Number.parseInt(req.params.id, 10)

    if (!(await isBoardMember(userId, boardId))) {
      throw new HttpError(403, 'Not a board member')
    }

    res.json(await listBoardActivity(boardId))
  }),
)

router.get(
  '/:id/activity/preview',
  asyncHandler(async (req, res) => {
    const boardId = Number.parseInt(req.params.id, 10)
    res.json(await listBoardActivity(boardId))
  }),
)

export default router
