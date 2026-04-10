import { Router, Request, Response } from 'express'
import { verifyToken } from '../auth'
import { asyncHandler } from '../http'
import {
  addMemberToBoard,
  createBoardForUser,
  getBoardDetailsForUser,
  listBoardsForUser,
} from '../services/board-service'

const router = Router()

// GET /boards — list boards for current user
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = verifyToken(req)
  const boards = await listBoardsForUser(userId)
  res.json(boards)
}))

// GET /boards/:id — full board with lists, cards, comments
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = verifyToken(req)
  const board = await getBoardDetailsForUser(userId, parseInt(req.params.id))
  res.json(board)
}))

// POST /boards — create board
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = verifyToken(req)
  const board = await createBoardForUser(userId, req.body.name)
  res.status(201).json(board)
}))

// POST /boards/:id/members — add member
router.post('/:id/members', asyncHandler(async (req: Request, res: Response) => {
  const userId = verifyToken(req)
  await addMemberToBoard(userId, parseInt(req.params.id), req.body.memberId)
  res.status(201).json({ ok: true })
}))

export default router
