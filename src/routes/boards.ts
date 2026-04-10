import { Router, Request, Response } from 'express'
import { verifyToken } from '../middleware/auth'
import {
  getBoardsForUser,
  getBoardWithDetails,
  createBoard,
  isBoardMember,
  addBoardMember,
} from '../repositories/boardRepository'

const router = Router()

// GET /boards — list boards for current user
router.get('/', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const boards = await getBoardsForUser(userId)
  res.json(boards)
})

// GET /boards/:id — full board with lists, cards, comments
router.get('/:id', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const boardId = parseInt(req.params.id)
  const member = await isBoardMember(userId, boardId)
  if (!member) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  const board = await getBoardWithDetails(boardId)
  if (!board) {
    res.status(404).json({ error: 'Board not found' })
    return
  }

  res.json(board)
})

// POST /boards — create board
router.post('/', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { name } = req.body
  const board = await createBoard(name, userId)
  res.status(201).json(board)
})

// POST /boards/:id/members — add member
router.post('/:id/members', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const boardId = parseInt(req.params.id)
  const member = await isBoardMember(userId, boardId)
  if (!member) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  const { memberId } = req.body
  await addBoardMember(memberId, boardId)
  res.status(201).json({ ok: true })
})

export default router
