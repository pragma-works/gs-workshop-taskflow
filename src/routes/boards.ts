import { Router, Request, Response } from 'express'
import { verifyToken, AuthRequest } from '../middleware/auth'
import boardService from '../services/BoardService'

const router = Router()

// GET /boards — list boards for current user
router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const boards = await boardService.getBoardsForUser(req.userId!)
    res.json(boards)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get boards', details: (error as Error).message })
  }
})

// GET /boards/:id — full board with lists, cards, comments
router.get('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const boardId = parseInt(req.params.id)
    const board = await boardService.getBoardDetails(boardId, req.userId!)
    res.json(board)
  } catch (error) {
    if ((error as Error).message === 'Not a board member') {
      res.status(403).json({ error: 'Not a board member' })
    } else if ((error as Error).message === 'Board not found') {
      res.status(404).json({ error: 'Board not found' })
    } else {
      res.status(500).json({ error: 'Failed to get board', details: (error as Error).message })
    }
  }
})

// POST /boards — create board
router.post('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body
    const board = await boardService.createBoard(name, req.userId!)
    res.status(201).json(board)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create board', details: (error as Error).message })
  }
})

// POST /boards/:id/members — add member
router.post('/:id/members', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const boardId = parseInt(req.params.id)
    const { memberId } = req.body
    await boardService.addMemberToBoard(boardId, memberId, req.userId!)
    res.status(201).json({ ok: true })
  } catch (error) {
    if ((error as Error).message === 'Only owners can add members') {
      res.status(403).json({ error: 'Only owners can add members' })
    } else {
      res.status(500).json({ error: 'Failed to add member', details: (error as Error).message })
    }
  }
})

// DELETE /boards/:id — delete board
router.delete('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const boardId = parseInt(req.params.id)
    await boardService.deleteBoard(boardId, req.userId!)
    res.json({ ok: true })
  } catch (error) {
    if ((error as Error).message === 'Only owners can delete boards') {
      res.status(403).json({ error: 'Only owners can delete boards' })
    } else {
      res.status(500).json({ error: 'Failed to delete board', details: (error as Error).message })
    }
  }
})

export default router
