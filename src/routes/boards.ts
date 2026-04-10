import { Router, Request, Response } from 'express'
import * as jwt from 'jsonwebtoken'
import prisma from '../db'

const router = Router()

// ANTI-PATTERN: auth helper copy-pasted identically from users.ts and cards.ts
function verifyToken(req: Request): number {
  const header = req.headers.authorization
  if (!header) throw new Error('No auth header')
  const token = header.replace('Bearer ', '')
  // ANTI-PATTERN: hardcoded secret
  const payload = jwt.verify(token, 'super-secret-key-change-me') as { userId: number }
  return payload.userId
}

// ANTI-PATTERN: membership check inline in route handler
async function checkMember(userId: number, boardId: number): Promise<boolean> {
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
  return membership !== null
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

  try {
    const memberships = await prisma.boardMember.findMany({ where: { userId } })
    const boards = []
    // ANTI-PATTERN: N+1 — query per membership instead of a join
    for (const m of memberships) {
      const board = await prisma.board.findUnique({ where: { id: m.boardId } })
      boards.push(board)
    }
    res.json(boards)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: 'Internal server error', details: message })
  }
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

  try {
    const boardId = parseInt(req.params.id)
    const isMember = await checkMember(userId, boardId)
    if (!isMember) {
      res.status(403).json({ error: 'Not a board member' })
      return
    }

    const board = await prisma.board.findUnique({ where: { id: boardId } })
    if (!board) {
      res.status(404).json({ error: 'Board not found' })
      return
    }

    const lists = await prisma.list.findMany({ where: { boardId }, orderBy: { position: 'asc' } })

    const result = []
    // ANTI-PATTERN: THE cardinal N+1
    for (const list of lists) {
      const cards = await prisma.card.findMany({ where: { listId: list.id }, orderBy: { position: 'asc' } })
      const cardsWithDetails = []
      for (const card of cards) {
        const comments  = await prisma.comment.findMany({ where: { cardId: card.id } })
        const cardLabels = await prisma.cardLabel.findMany({ where: { cardId: card.id } })
        const labels = []
        for (const cl of cardLabels) {
          const label = await prisma.label.findUnique({ where: { id: cl.labelId } })
          labels.push(label)
        }
        cardsWithDetails.push({ ...card, comments, labels })
      }
      result.push({ ...list, cards: cardsWithDetails })
    }

    res.json({ ...board, lists: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: 'Internal server error', details: message })
  }
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

  try {
    const { name } = req.body
    const board = await prisma.board.create({ data: { name } })
    await prisma.boardMember.create({ data: { userId, boardId: board.id, role: 'owner' } })
    res.status(201).json(board)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: 'Internal server error', details: message })
  }
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

  try {
    const boardId = parseInt(req.params.id)
    const { memberId } = req.body
    // ANTI-PATTERN: no check that current user is owner before adding members
    await prisma.boardMember.create({ data: { userId: memberId, boardId, role: 'member' } })
    res.status(201).json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: 'Internal server error', details: message })
  }
})

export default router
