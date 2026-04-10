import { Router, Request, Response, NextFunction } from 'express'
import { verifyToken } from '../middleware/auth'
import { BoardService } from '../services/boardService'

const router = Router()
const boardService = new BoardService()

// GET /boards — list boards for current user
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = verifyToken(req)
    const boards = await boardService.listBoardsForUser(userId)
    res.json(boards)
  } catch (error) {
    next(error)
  }
})

// GET /boards/:id — full board with lists, cards, comments
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = verifyToken(req)
    const boardId = parseInt(req.params.id, 10)
    const board = await boardService.getBoardDetailsForUser(userId, boardId)
    res.json(board)
  } catch (error) {
    next(error)
  }
})

// POST /boards — create board
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = verifyToken(req)
    const board = await boardService.createBoard(userId, req.body.name)
    res.status(201).json(board)
  } catch (error) {
    next(error)
  }
})

// POST /boards/:id/members — add member
router.post('/:id/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = verifyToken(req)
    const boardId = parseInt(req.params.id, 10)
    const memberId = parseInt(req.body.memberId, 10)
    const result = await boardService.addMember(userId, boardId, memberId)
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
})

export default router
