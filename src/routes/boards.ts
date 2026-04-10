import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { asyncHandler } from '../middleware/async-handler'
import { addMemberToBoard, createBoardForUser, getBoardForUser, getBoardsForUser } from '../services/boards-service'
import { parseId } from '../services/http-input'

const router = Router()

router.use(requireAuth)

// GET /boards — list boards for current user
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const boards = await getBoardsForUser(req.authUserId as number)
  res.json(boards)
}))

// GET /boards/:id — full board with lists, cards, comments
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const boardId = parseId(req.params.id, 'id')
  const board = await getBoardForUser(req.authUserId as number, boardId)
  res.json(board)
}))

// POST /boards — create board
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const board = await createBoardForUser(req.authUserId as number, req.body)
  res.status(201).json(board)
}))

// POST /boards/:id/members — add member
router.post('/:id/members', asyncHandler(async (req: Request, res: Response) => {
  const boardId = parseId(req.params.id, 'id')
  const result = await addMemberToBoard(req.authUserId as number, boardId, req.body)
  res.status(201).json(result)
}))

export default router
