import { Router, Request, Response } from 'express'
import { verifyToken } from '../auth'
import { PrismaBoardRepository } from '../repositories/PrismaBoardRepository'
import { PrismaBoardMemberRepository } from '../repositories/PrismaBoardMemberRepository'

const router = Router()

const boardRepo       = new PrismaBoardRepository()
const boardMemberRepo = new PrismaBoardMemberRepository()

// GET /boards — list boards for current user
router.get('/', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const boards = await boardRepo.findByUserId(userId)
  res.json(boards)
})

// GET /boards/:id — full board with lists, cards, comments, labels
router.get('/:id', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const boardId  = parseInt(req.params.id)
  const isMember = await boardMemberRepo.isMember(userId, boardId)
  if (!isMember) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  const board = await boardRepo.findByIdWithDetails(boardId)
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
  const board = await boardRepo.create(name)
  await boardMemberRepo.addMember(userId, board.id, 'owner')
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

  const boardId        = parseInt(req.params.id)
  const { memberId }   = req.body
  await boardMemberRepo.addMember(memberId, boardId, 'member')
  res.status(201).json({ ok: true })
})

export default router
