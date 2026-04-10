import { Router, Request, Response } from 'express'
import prisma from '../db'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.use(requireAuth)

// ANTI-PATTERN: membership check inline in route handler
async function checkMember(userId: number, boardId: number): Promise<boolean> {
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
  return membership !== null
}

// GET /boards — list boards for current user
router.get('/', async (req: Request, res: Response) => {
  const userId = req.userId as number
  const boards = await prisma.board.findMany({
    where: { members: { some: { userId } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(boards)
})

// GET /boards/:id — full board with lists, cards, comments
router.get('/:id', async (req: Request, res: Response) => {
  const userId = req.userId as number

  const boardId = parseInt(req.params.id)
  if (Number.isNaN(boardId)) {
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

  const lists = board.lists.map((list) => ({
    ...list,
    cards: list.cards.map((card) => ({
      ...card,
      labels: card.labels.map((cardLabel) => cardLabel.label),
    })),
  }))

  res.json({ ...board, lists })
})

// POST /boards — create board
router.post('/', async (req: Request, res: Response) => {
  const userId = req.userId as number

  const { name } = req.body
  const board = await prisma.board.create({ data: { name } })
  await prisma.boardMember.create({ data: { userId, boardId: board.id, role: 'owner' } })
  res.status(201).json(board)
})

// POST /boards/:id/members — add member
router.post('/:id/members', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)
  if (Number.isNaN(boardId)) {
    res.status(400).json({ error: 'Invalid board id' })
    return
  }

  const { memberId } = req.body
  // ANTI-PATTERN: no check that current user is owner before adding members
  await prisma.boardMember.create({ data: { userId: memberId, boardId, role: 'member' } })
  res.status(201).json({ ok: true })
})

export default router
