import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { getBoardsForUser, getBoardById, createBoard, getMembership, addMember } from '../services/boardService'

const router = Router()

// GET /boards — list boards for current user
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const userId = res.locals.userId as number
  const boards = await getBoardsForUser(userId)
  res.json(boards)
})

// GET /boards/:id — full board with lists, cards, comments
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const userId = res.locals.userId as number
  const boardId = parseInt(req.params.id)

  const membership = await getMembership(userId, boardId)
  if (!membership) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  const board = await getBoardById(boardId)
  if (!board) {
    res.status(404).json({ error: 'Board not found' })
    return
  }

  res.json(board)
})

// POST /boards — create board
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const userId = res.locals.userId as number
  const { name } = req.body
  const board = await createBoard(name, userId)
  res.status(201).json(board)
})

// POST /boards/:id/members — add member
router.post('/:id/members', requireAuth, async (req: Request, res: Response) => {
  const userId = res.locals.userId as number
  const boardId = parseInt(req.params.id)
  const { memberId } = req.body

  const membership = await getMembership(userId, boardId)
  if (!membership) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  try {
    const newMember = await addMember(boardId, memberId, membership.role)
    res.status(201).json(newMember)
  } catch (err) {
    if (err instanceof Error && err.message === 'Forbidden') {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    throw err
  }
})

export default router
