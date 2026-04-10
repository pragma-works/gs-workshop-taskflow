import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { requireAuth, AuthRequest } from '../middleware/auth'
import * as boardRepo from '../repositories/boardRepository'

const router = Router()

const CreateBoardSchema = z.object({ name: z.string().min(1) })
const AddMemberSchema   = z.object({ memberId: z.number().int().positive() })

// GET /boards — list boards for current user
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId
  const boards = await boardRepo.getBoardsForUser(userId)
  res.json(boards)
})

// GET /boards/:id — full board with lists, cards, comments, labels
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const userId  = (req as AuthRequest).userId
  const boardId = parseInt(req.params.id)

  const isMember = await boardRepo.isBoardMember(userId, boardId)
  if (!isMember) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  const board = await boardRepo.getBoardWithDetails(boardId)
  if (!board) {
    res.status(404).json({ error: 'Board not found' })
    return
  }
  res.json(board)
})

// POST /boards — create board
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const parsed = CreateBoardSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    return
  }
  const userId = (req as AuthRequest).userId
  const board  = await boardRepo.createBoard(parsed.data.name)
  await boardRepo.addBoardOwner(userId, board.id)
  res.status(201).json(board)
})

// POST /boards/:id/members — add member (owner only)
router.post('/:id/members', requireAuth, async (req: Request, res: Response) => {
  const parsed = AddMemberSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    return
  }
  const userId  = (req as AuthRequest).userId
  const boardId = parseInt(req.params.id)

  const isOwner = await boardRepo.isBoardOwner(userId, boardId)
  if (!isOwner) {
    res.status(403).json({ error: 'Only board owners can add members' })
    return
  }

  const member = await boardRepo.addBoardMember(parsed.data.memberId, boardId)
  res.status(201).json(member)
})

export default router

