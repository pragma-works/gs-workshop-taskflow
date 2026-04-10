import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import * as boardService from '../services/board.service'

const router = Router()

// GET /boards — list boards for current user
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const boards = await boardService.listBoards((req as any).userId)
  res.json(boards)
})

// GET /boards/:id — full board with lists, cards, comments
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const boardId = parseInt(req.params.id)
    const board = await boardService.getBoard(boardId, (req as any).userId)
    res.json(board)
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

// POST /boards — create board
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { name } = req.body
  const board = await boardService.createBoard(name, (req as any).userId)
  res.status(201).json(board)
})

// POST /boards/:id/members — add member
router.post('/:id/members', requireAuth, async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)
  const { memberId } = req.body
  await boardService.addMember(boardId, memberId)
  res.status(201).json({ ok: true })
})

export default router
