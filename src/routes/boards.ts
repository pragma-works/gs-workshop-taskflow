import { Router, Request, Response } from 'express'
import { verifyToken } from '../middleware/auth'
import * as repo from '../repositories'

const router = Router()

async function checkMember(userId: number, boardId: number): Promise<boolean> {
  const membership = await repo.findBoardMemberByUserAndBoard(userId, boardId)
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

  const memberships = await repo.findBoardMembersByUser(userId)
  const boards = []
  for (const m of memberships) {
    const board = await repo.findBoardById(m.boardId)
    boards.push(board)
  }
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
  const isMember = await checkMember(userId, boardId)
  if (!isMember) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  const board = await repo.findBoardById(boardId)
  if (!board) {
    res.status(404).json({ error: 'Board not found' })
    return
  }

  const lists = await repo.findListsByBoard(boardId)

  const result = []
  for (const list of lists) {
    const cards = await repo.findCardsByList(list.id)
    const cardsWithDetails = []
    for (const card of cards) {
      const comments = await repo.findCommentsByCard(card.id)
      const cardLabels = await repo.findCardLabelsByCard(card.id)
      const labels = []
      for (const cl of cardLabels) {
        const label = await repo.findLabelById(cl.labelId)
        labels.push(label)
      }
      cardsWithDetails.push({ ...card, comments, labels })
    }
    result.push({ ...list, cards: cardsWithDetails })
  }

  res.json({ ...board, lists: result })
})

// GET /boards/:id/activity — full activity feed (requires auth and membership)
router.get('/:id/activity', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const boardId = parseInt(req.params.id)
  const isMember = await checkMember(userId, boardId)
  if (!isMember) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }
  const events = await repo.findActivityEventsByBoard(boardId)
  const parsed = events.map(e => {
    let parsedMeta: any = null
    if (e.meta) {
      try {
        parsedMeta = JSON.parse(e.meta)
      } catch (err) {
        parsedMeta = e.meta
      }
    }
    return { ...e, meta: parsedMeta }
  })
  res.json({ events: parsed })
})

// GET /boards/:id/activity/preview — last 10 events, no auth required (smoke)
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)
  const events = await repo.findActivityEventsPreview(boardId)
  const parsed = events.map(e => {
    let parsedMeta: any = null
    if (e.meta) {
      try {
        parsedMeta = JSON.parse(e.meta)
      } catch (err) {
        parsedMeta = e.meta
      }
    }
    return { ...e, meta: parsedMeta }
  })
  res.json({ events: parsed })
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
  const board = await repo.createBoard(name)
  await repo.createBoardMember({ userId, boardId: board.id, role: 'owner' })
  res.status(201).json(board)
})

// POST /boards/:id/members — add member (only owner)
router.post('/:id/members', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const boardId = parseInt(req.params.id)
  const { memberId } = req.body

  // Check current user's membership and role
  const membership = await repo.findBoardMemberByUserAndBoard(userId, boardId)
  if (!membership || membership.role !== 'owner') {
    res.status(403).json({ error: 'Only board owner can add members' })
    return
  }

  await repo.createBoardMember({ userId: memberId, boardId, role: 'member' })
  res.status(201).json({ ok: true })
})

export default router
