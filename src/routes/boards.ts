import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../db'
import { verifyToken } from '../lib/auth'

const router = Router()

const CreateBoardSchema = z.object({ name: z.string().min(1).max(255) })
const AddMemberSchema   = z.object({ memberId: z.number().int().positive() })

async function checkMember(userId: number, boardId: number): Promise<boolean> {
  const m = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
  return m !== null
}

async function checkOwner(userId: number, boardId: number): Promise<boolean> {
  const m = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
  return m?.role === 'owner'
}

// GET /boards — list boards for current user
router.get('/', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const memberships = await prisma.boardMember.findMany({
    where: { userId },
    include: { board: true },
  })
  res.json(memberships.map(m => m.board))
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

  const boardId = parseInt(req.params.id)
  if (isNaN(boardId)) {
    res.status(400).json({ error: 'Invalid board id' })
    return
  }
  const isMember = await checkMember(userId, boardId)
  if (!isMember) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      lists: {
        orderBy: { position: 'asc' },
        include: {
          cards: {
            orderBy: { position: 'asc' },
            include: {
              comments: true,
              labels: { include: { label: true } },
            },
          },
        },
      },
    },
  })
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

  const parsed = CreateBoardSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors })
    return
  }
  const { name } = parsed.data
  const board = await prisma.board.create({ data: { name } })
  await prisma.boardMember.create({ data: { userId, boardId: board.id, role: 'owner' } })
  res.status(201).json(board)
})

// POST /boards/:id/members — add member (owner only)
router.post('/:id/members', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const boardId = parseInt(req.params.id)
  if (isNaN(boardId)) {
    res.status(400).json({ error: 'Invalid board id' })
    return
  }
  const isOwner = await checkOwner(userId, boardId)
  if (!isOwner) {
    res.status(403).json({ error: 'Only the board owner can add members' })
    return
  }

  const parsed = AddMemberSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors })
    return
  }
  const { memberId } = parsed.data
  await prisma.boardMember.create({ data: { userId: memberId, boardId, role: 'member' } })
  res.status(201).json({ ok: true })
})

export default router
