import { Router, Request, Response } from 'express'
import { CardService } from '../services/CardService'
import { requireAuth, AuthRequest } from '../middleware/auth'

export function createCardsRouter(cardService: CardService) {
  const router = Router()

  router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const card = await cardService.getCard(parseInt(req.params.id))
      res.json(card)
    } catch (err: any) {
      res.status(err.status ?? 500).json({ error: err.message })
    }
  })

  router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
    const { title, description, listId, assigneeId } = req.body
    const card = await cardService.createCard({ title, description, listId, assigneeId })
    res.status(201).json(card)
  })

  router.patch('/:id/move', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { targetListId, position } = req.body
      const event = await cardService.moveCard(
        parseInt(req.params.id),
        targetListId,
        position,
        req.userId!,
      )
      res.json({ ok: true, event })
    } catch (err: any) {
      if (err.status === 404) {
        res.status(404).json({ error: err.message })
        return
      }
      res.status(500).json({ error: 'Move failed', details: err.message })
    }
  })

  router.post('/:id/comments', requireAuth, async (req: AuthRequest, res: Response) => {
    const comment = await cardService.addComment(
      parseInt(req.params.id),
      req.userId!,
      req.body.content,
    )
    res.status(201).json(comment)
  })

  router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    await cardService.deleteCard(parseInt(req.params.id))
    res.json({ ok: true })
  })

  return router
}
