import { Router, Request, Response } from 'express'
import { verifyToken } from '../middleware/auth'
import { BoardRepository } from '../repositories/board.repository'
import { ActivityRepository } from '../repositories/activity.repository'
import { ActivityService } from '../services/activity.service'

const router = Router()
const boardRepo = new BoardRepository()
const activityRepo = new ActivityRepository()
const activityService = new ActivityService(activityRepo, boardRepo)

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
  const isMember = await boardRepo.isMember(userId, boardId)
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

// GET /boards/:id/activity — activity feed for board
router.get('/:id/activity', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const boardId = parseInt(req.params.id)

  try {
    const result = await activityService.getBoardActivity(boardId, userId)
    res.json(result)
  } catch (error: any) {
    if (error.message === 'Board not found') {
      res.status(404).json({ error: 'Board not found' })
    } else if (error.message === 'Not a board member') {
      res.status(403).json({ error: 'Not a board member' })
    } else {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

// GET /boards/:id/activity/preview — no-auth activity preview
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)

  try {
    const result = await activityService.getBoardActivityPreview(boardId)
    res.json(result)
  } catch (error: any) {
    if (error.message === 'Board not found') {
      res.status(404).json({ error: 'Board not found' })
    } else {
      res.status(500).json({ error: 'Internal server error' })
    }
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

  const { name } = req.body
  const board = await boardRepo.create(name, userId)
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
  // Note: In production, should verify current user is owner
  await boardRepo.addMember(memberId, boardId)
  res.status(201).json({ ok: true })
})

export default router
