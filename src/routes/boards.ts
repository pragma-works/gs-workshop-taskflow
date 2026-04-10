import { Router, Response } from 'express'
import { BoardService } from '../services/BoardService'
import { requireAuth, AuthRequest } from '../middleware/auth'

export function createBoardsRouter(boardService: BoardService) {
  const router = Router()

  router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
    const boards = await boardService.getBoardsForUser(req.userId!)
    res.json(boards)
  })

  router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const board = await boardService.getBoard(req.userId!, parseInt(req.params.id))
      res.json(board)
    } catch (err: any) {
      res.status(err.status ?? 500).json({ error: err.message })
    }
  })

  router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
    const board = await boardService.createBoard(req.body.name, req.userId!)
    res.status(201).json(board)
  })

  router.post('/:id/members', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      await boardService.addMember(req.userId!, parseInt(req.params.id), req.body.memberId)
      res.status(201).json({ ok: true })
    } catch (err: any) {
      res.status(err.status ?? 500).json({ error: err.message })
    }
  })

  return router
}
