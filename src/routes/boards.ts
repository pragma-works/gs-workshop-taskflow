import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import * as boardService from '../services/boardService'

const router = Router()

// GET /boards — list boards for current user
router.get('/', authenticate, async (req, res: Response) => {
  const userId = (req as AuthRequest).userId
  const boards = await boardService.getBoardsForUser(userId)
  res.json(boards)
})

// GET /boards/:id — full board with lists, cards, comments
router.get('/:id', authenticate, async (req, res: Response) => {
  const userId = (req as AuthRequest).userId
  const boardId = parseInt(req.params.id)

  const isMember = await boardService.isBoardMember(userId, boardId)
  if (!isMember) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  const board = await boardService.getBoardDetail(boardId)
  if (!board) {
    res.status(404).json({ error: 'Board not found' })
    return
  }

  res.json(board)
})

// POST /boards — create board
router.post('/', authenticate, async (req, res: Response) => {
  const userId = (req as AuthRequest).userId
  const { name } = req.body
  const board = await boardService.createBoard(userId, name)
  res.status(201).json(board)
})

// POST /boards/:id/members — add member
router.post('/:id/members', authenticate, async (req, res: Response) => {
  const boardId = parseInt(req.params.id)
  const { memberId } = req.body
  await boardService.addBoardMember(boardId, memberId)
  res.status(201).json({ ok: true })
})

export default router
