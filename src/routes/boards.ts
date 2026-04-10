import { Router, Response } from 'express'
import { HttpError } from '../errors/httpError'
import { AuthenticatedRequest, requireAuth } from '../middleware/auth'
import { handleError, parseIntParam } from '../middleware/routeHelpers'
import { validateBody } from '../middleware/validate'
import {
  addMemberToBoard,
  createBoardForUser,
  getBoardActivityForUser,
  getBoardActivityPreview,
  getBoardByIdForUser,
  getBoardsForUser,
} from '../services/taskflowService'

const router = Router()

// GET /boards — list boards for current user
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const boards = await getBoardsForUser(req.userId!)
    res.json(boards)
  } catch (error: unknown) {
    handleError(res, error)
  }
})

// GET /boards/:id — full board with lists, cards, comments
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const board = await getBoardByIdForUser(req.userId!, parseIntParam(req.params.id))
    res.json(board)
  } catch (error: unknown) {
    handleError(res, error)
  }
})

// GET /boards/:id/activity — full activity feed
router.get('/:id/activity', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payload = await getBoardActivityForUser(req.userId!, parseIntParam(req.params.id))
    res.json(payload)
  } catch (error: unknown) {
    handleError(res, error)
  }
})

// GET /boards/:id/activity/preview — public smoke endpoint
router.get('/:id/activity/preview', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payload = await getBoardActivityPreview(parseIntParam(req.params.id))
    res.json(payload)
  } catch (error: unknown) {
    handleError(res, error)
  }
})

// POST /boards — create board
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = validateBody<{ name: string }>(req.body, {
      name: { type: 'string', min: 1, max: 120 },
    })
    const board = await createBoardForUser(req.userId!, name)
    res.status(201).json(board)
  } catch (error: unknown) {
    handleError(res, error)
  }
})

// POST /boards/:id/members — add member
router.post('/:id/members', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { memberId } = validateBody<{ memberId: number }>(req.body, {
      memberId: { type: 'number', min: 1 },
    })
    await addMemberToBoard(req.userId!, parseIntParam(req.params.id), memberId as unknown as number)
    res.status(201).json({ ok: true })
  } catch (error: unknown) {
    handleError(res, error)
  }
})

export default router
