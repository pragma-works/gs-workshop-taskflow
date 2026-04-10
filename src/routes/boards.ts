import { Router, Request, Response } from 'express'
import prisma from '../db'
import { authMiddleware } from '../middleware/auth'
import { BoardRepository, ActivityRepository } from '../repositories'

const router = Router()

// GET /boards — list boards for current user
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId

  const boards = await BoardRepository.getUserBoards(userId)
  res.json(boards)
})

// GET /boards/:id — full board with lists, cards, comments
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId
  const boardId = parseInt(req.params.id)

  const isMember = await BoardRepository.isMember(userId, boardId)
  if (!isMember) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  const board = await BoardRepository.getByIdWithHierarchy(boardId)
  if (!board) {
    res.status(404).json({ error: 'Board not found' })
    return
  }

  res.json(board)
})

// POST /boards — create board
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId
  const { name } = req.body
  const board = await prisma.board.create({ data: { name } })
  await prisma.boardMember.create({ data: { userId, boardId: board.id, role: 'owner' } })
  res.status(201).json(board)
})

// POST /boards/:id/members — add member
router.post('/:id/members', authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId
  const boardId = parseInt(req.params.id)
  const { memberId } = req.body
  // ANTI-PATTERN: no check that current user is owner before adding members
  await prisma.boardMember.create({ data: { userId: memberId, boardId, role: 'member' } })
  res.status(201).json({ ok: true })
})

// GET /boards/:id/activity — get all activity events for a board (authenticated)
router.get('/:id/activity', authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId
  const boardId = parseInt(req.params.id)

  // Check board exists
  const board = await BoardRepository.getById(boardId)
  if (!board) {
    res.status(404).json({ error: 'Board not found' })
    return
  }

  // Check membership
  const isMember = await BoardRepository.isMember(userId, boardId)
  if (!isMember) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  // Fetch activity (newest first)
  const events = await ActivityRepository.getByBoardId(boardId)
  res.json({ events })
})

// GET /boards/:id/activity/preview — get recent activity events (no auth required — for smoke testing)
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)

  // Check board exists (optional for preview)
  const board = await BoardRepository.getById(boardId)
  if (!board) {
    res.status(404).json({ error: 'Board not found' })
    return
  }

  // Fetch recent activity (last 10)
  const events = await ActivityRepository.getRecent(boardId, 10)
  res.json({ events })
})

export default router
