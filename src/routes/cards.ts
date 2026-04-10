import { Router, Response } from 'express'
import { HttpError } from '../errors/httpError'
import { AuthenticatedRequest, requireAuth } from '../middleware/auth'
import {
  addCommentForUser,
  createCardForList,
  deleteCardById,
  getCardById,
  moveCardForUser,
} from '../services/taskflowService'

const router = Router()

function parseCardId(value: string): number {
  return Number.parseInt(value, 10)
}

function handleError(res: Response, error: unknown): void {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ error: error.message })
    return
  }

  res.status(500).json({ error: 'Internal server error' })
}

// GET /cards/:id
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const card = await getCardById(parseCardId(req.params.id))
    res.json(card)
  } catch (error: unknown) {
    handleError(res, error)
  }
})

// POST /cards — create card
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const card = await createCardForList(req.body)
    res.status(201).json(card)
  } catch (error: unknown) {
    handleError(res, error)
  }
})

// POST /cards/:id/move — move card and write activity event atomically
router.post('/:id/move', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await moveCardForUser(req.userId!, {
      cardId: parseCardId(req.params.id),
      targetListId: req.body.targetListId,
      position: req.body.position,
    })
    res.json({ ok: true })
  } catch (error: unknown) {
    handleError(res, error)
  }
})

// Backward-compatible alias for previous method semantics.
router.patch('/:id/move', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await moveCardForUser(req.userId!, {
      cardId: parseCardId(req.params.id),
      targetListId: req.body.targetListId,
      position: req.body.position,
    })
    res.json({ ok: true })
  } catch (error: unknown) {
    handleError(res, error)
  }
})

// POST /cards/:id/comments — add comment
router.post('/:id/comments', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const comment = await addCommentForUser(req.userId!, {
      cardId: parseCardId(req.params.id),
      content: req.body.content,
    })
    res.status(201).json(comment)
  } catch (error: unknown) {
    handleError(res, error)
  }
})

// DELETE /cards/:id
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await deleteCardById(parseCardId(req.params.id))
    res.json({ ok: true })
  } catch (error: unknown) {
    handleError(res, error)
  }
})

export default router
