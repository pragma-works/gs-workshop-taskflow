import { Router, Request, Response } from 'express'
import * as jwt from 'jsonwebtoken'
import {
  findMembership, findMembershipsByUser, findBoardById,
  createBoard, addBoardMember, findListsByBoard,
  findCardsByList, findCommentsByCard, findCardLabelsByCard, findLabelById
} from '../repository'

const router = Router()

function verifyToken(req: Request): number {
  const header = req.headers.authorization
  if (!header) throw new Error('No auth header')
  const token = header.replace('Bearer ', '')
  const payload = jwt.verify(token, 'super-secret-key-change-me') as { userId: number }
  return payload.userId
}

async function checkMember(userId: number, boardId: number): Promise<boolean> {
  const membership = await findMembership(userId, boardId)
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

  const memberships = await findMembershipsByUser(userId)
  const boards = []
  for (const m of memberships) {
    const board = await findBoardById(m.boardId)
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

  const board = await findBoardById(boardId)
  if (!board) {
    res.status(404).json({ error: 'Board not found' })
    return
  }

  const lists = await findListsByBoard(boardId)

  const result = []
  for (const list of lists) {
    const cards = await findCardsByList(list.id)
    const cardsWithDetails = []
    for (const card of cards) {
      const comments = await findCommentsByCard(card.id)
      const cardLabels = await findCardLabelsByCard(card.id)
      const labels = []
      for (const cl of cardLabels) {
        const label = await findLabelById(cl.labelId)
        labels.push(label)
      }
      cardsWithDetails.push({ ...card, comments, labels })
    }
    result.push({ ...list, cards: cardsWithDetails })
  }

  res.json({ ...board, lists: result })
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
  const board = await createBoard(name)
  await addBoardMember(userId, board.id, 'owner')
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

  const boardId = parseInt(req.params.id)
  const { memberId } = req.body
  await addBoardMember(memberId, boardId, 'member')
  res.status(201).json({ ok: true })
})

export default router
