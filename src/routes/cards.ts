import { Router, Response } from 'express'
import { HttpError } from '../errors/httpError'
import { AuthenticatedRequest, requireAuth } from '../middleware/auth'
import { handleError, parseIntParam } from '../middleware/routeHelpers'
import { validateBody } from '../middleware/validate'
import {
  addCommentForUser,
  createCardForList,
  deleteCardById,
  getCardById,
  moveCardForUser,
} from '../services/taskflowService'

const router = Router()

// GET /cards/:id
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const card = await getCardById(parseIntParam(req.params.id))
    res.json(card)
  } catch (error: unknown) {
    handleError(res, error)
  }
})

// POST /cards — create card
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = validateBody<{ title: string; listId: number; description?: string; assigneeId?: number }>(req.body, {
      title: { type: 'string', min: 1, max: 200 },
      listId: { type: 'number', min: 1 },
      description: { type: 'string', optional: true, max: 2000 },
      assigneeId: { type: 'number', optional: true, min: 1 },
    })
    const card = await createCardForList(body)
    res.status(201).json(card)
  } catch (error: unknown) {
    handleError(res, error)
  }
})

// POST /cards/:id/move — move card and write activity event atomically
router.post('/:id/move', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetListId, position } = validateBody<{ targetListId: number; position: number }>(req.body, {
      targetListId: { type: 'number', min: 1 },
      position: { type: 'number', min: 0 },
    })
    await moveCardForUser(req.userId!, {
      cardId: parseIntParam(req.params.id),
      targetListId: targetListId as unknown as number,
      position: position as unknown as number,
    })
    res.json({ ok: true })
  } catch (error: unknown) {
    handleError(res, error)
  }
})

// Backward-compatible alias for previous method semantics.
router.patch('/:id/move', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetListId, position } = validateBody<{ targetListId: number; position: number }>(req.body, {
      targetListId: { type: 'number', min: 1 },
      position: { type: 'number', min: 0 },
    })
    await moveCardForUser(req.userId!, {
      cardId: parseIntParam(req.params.id),
      targetListId: targetListId as unknown as number,
      position: position as unknown as number,
    })
    res.json({ ok: true })
  } catch (error: unknown) {
    handleError(res, error)
  }
})

// POST /cards/:id/comments — add comment
router.post('/:id/comments', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { content } = validateBody<{ content: string }>(req.body, {
      content: { type: 'string', min: 1, max: 5000 },
    })
    const comment = await addCommentForUser(req.userId!, {
      cardId: parseIntParam(req.params.id),
      content,
    })
    res.status(201).json(comment)
  } catch (error: unknown) {
    handleError(res, error)
  }
})

// DELETE /cards/:id
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await deleteCardById(parseIntParam(req.params.id))
    res.json({ ok: true })
  } catch (error: unknown) {
    handleError(res, error)
  }
})

export default router
