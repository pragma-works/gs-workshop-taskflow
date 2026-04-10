import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../db'
import { AuthRequest, requireAuth } from '../middleware/auth'
import { validateBody, validateParams } from '../middleware/validation'
import { boardService } from '../services/boardService'

const router = Router()

const idParamSchema = z.object({ id: z.coerce.number().int().positive() })
const createBoardSchema = z.object({ name: z.string().min(1) })
const addMemberSchema = z.object({ memberId: z.number().int().positive() })

router.use(requireAuth)

// ANTI-PATTERN: membership check inline in route handler
async function checkMember(userId: number, boardId: number): Promise<boolean> {
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
  return membership !== null
}

// GET /boards — list boards for current user
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.userId as number

  const boards = await boardService.listBoardsForUser(userId)
  res.json(boards)
})

// GET /boards/:id — full board with lists, cards, comments
router.get('/:id', validateParams(idParamSchema), async (req: AuthRequest, res: Response) => {
  const userId = req.userId as number

  const boardId = Number(req.params.id)
  const result = await boardService.getBoardForMember(userId, boardId)

  if (result.type === 'forbidden') {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  if (result.type === 'not_found') {
    res.status(404).json({ error: 'Board not found' })
    return
  }

  res.json(result.board)
})

// POST /boards — create board
router.post('/', validateBody(createBoardSchema), async (req: AuthRequest, res: Response) => {
  const userId = req.userId as number

  const { name } = req.body
  const board = await prisma.board.create({ data: { name } })
  await prisma.boardMember.create({ data: { userId, boardId: board.id, role: 'owner' } })
  res.status(201).json(board)
})

// POST /boards/:id/members — add member
router.post('/:id/members', validateParams(idParamSchema), validateBody(addMemberSchema), async (req: AuthRequest, res: Response) => {

  const boardId = Number(req.params.id)
  const { memberId } = req.body
  // ANTI-PATTERN: no check that current user is owner before adding members
  await prisma.boardMember.create({ data: { userId: memberId, boardId, role: 'member' } })
  res.status(201).json({ ok: true })
})

export default router
