import { Router, Response } from 'express'
import { requireAuth, AuthRequest } from '../middleware/auth'
import * as boardRepo from '../repositories/boardRepository'

const router = Router()

// GET /boards — list boards for current user
router.get('/', requireAuth, async (req, res: Response) => {
  const { userId } = req as AuthRequest
  const boards = await boardRepo.findBoardsByUser(userId)
  res.json(boards)
})

// GET /boards/:id — full board with lists, cards, comments
router.get('/:id', requireAuth, async (req, res: Response) => {
  const { userId } = req as AuthRequest
  const boardId = parseInt(req.params.id)

  const isMember = await boardRepo.isBoardMember(userId, boardId)
  if (!isMember) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  const board = await boardRepo.findBoardWithDetails(boardId)
  if (!board) {
    res.status(404).json({ error: 'Board not found' })
    return
  }

  res.json(board)
})

// POST /boards — create board
router.post('/', requireAuth, async (req, res: Response) => {
  const { userId } = req as AuthRequest
  const { name } = req.body
  const board = await boardRepo.createBoard(name, userId)
  res.status(201).json(board)
})

// POST /boards/:id/members — add member
router.post('/:id/members', requireAuth, async (req, res: Response) => {
  const boardId = parseInt(req.params.id)
  const { memberId } = req.body
  await boardRepo.addBoardMember(boardId, memberId)
  res.status(201).json({ ok: true })
})

export default router
