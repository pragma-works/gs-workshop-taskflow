import { Router, Response } from 'express'
import { HttpError } from '../errors/httpError'
import { AuthenticatedRequest, requireAuth } from '../middleware/auth'
import {
  addMemberToBoard,
  createBoardForUser,
  getBoardActivityForUser,
  getBoardActivityPreview,
  getBoardByIdForUser,
  getBoardsForUser,
} from '../services/taskflowService'

const router = Router()

function parseBoardId(value: string): number {
  return Number.parseInt(value, 10)
}

function handleError(res: Response, error: unknown): void {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ error: error.message })
    return
  }

  res.status(500).json({ error: 'Internal server error' })
}

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
    const board = await getBoardByIdForUser(req.userId!, parseBoardId(req.params.id))
    res.json(board)
  } catch (error: unknown) {
    handleError(res, error)
  }
})

// GET /boards/:id/activity — full activity feed
router.get('/:id/activity', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payload = await getBoardActivityForUser(req.userId!, parseBoardId(req.params.id))
    res.json(payload)
  } catch (error: unknown) {
    handleError(res, error)
  }
})

// GET /boards/:id/activity/preview — public smoke endpoint
router.get('/:id/activity/preview', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payload = await getBoardActivityPreview(parseBoardId(req.params.id))
    res.json(payload)
  } catch (error: unknown) {
    handleError(res, error)
  }
})

// POST /boards — create board
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const board = await createBoardForUser(req.userId!, req.body.name)
    res.status(201).json(board)
  } catch (error: unknown) {
    handleError(res, error)
  }
})

// POST /boards/:id/members — add member
router.post('/:id/members', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await addMemberToBoard(req.userId!, parseBoardId(req.params.id), req.body.memberId)
    res.status(201).json({ ok: true })
  } catch (error: unknown) {
    handleError(res, error)
  }
})

export default router
