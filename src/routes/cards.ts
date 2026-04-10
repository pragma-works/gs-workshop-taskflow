import { Router, Request, Response } from 'express'
import { verifyToken } from '../middleware/auth'
import { CardRepository } from '../repositories/card.repository'
import { ActivityRepository } from '../repositories/activity.repository'
import { CommentRepository } from '../repositories/comment.repository'
import { CardService } from '../services/card.service'

const router = Router()
const cardRepo = new CardRepository()
const activityRepo = new ActivityRepository()
const commentRepo = new CommentRepository()
const cardService = new CardService(cardRepo, activityRepo, commentRepo)

// GET /cards/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const card = await cardService.getCard(parseInt(req.params.id))
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(card)
})

// POST /cards — create card
router.post('/', async (req: Request, res: Response) => {
  try {
    verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { title, description, listId, assigneeId } = req.body
  const card = await cardService.createCard(title, description, listId, assigneeId)
  res.status(201).json(card)
})

// PATCH /cards/:id/move — move card to different list
router.patch('/:id/move', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const cardId = parseInt(req.params.id)
  const { targetListId, position } = req.body

  try {
    await cardService.moveCard(cardId, targetListId, position, userId)
    res.json({ ok: true })
  } catch (error: any) {
    if (error.message === 'Card not found' || error.message === 'List not found') {
      res.status(404).json({ error: 'Not found' })
    } else {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

// POST /cards/:id/comments — add comment
router.post('/:id/comments', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { content } = req.body
  const cardId = parseInt(req.params.id)

  try {
    const comment = await cardService.addComment(cardId, content, userId)
    res.status(201).json(comment)
  } catch (error: any) {
    if (error.message === 'Card not found' || error.message === 'List not found') {
      res.status(404).json({ error: 'Not found' })
    } else {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

// DELETE /cards/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const cardId = parseInt(req.params.id)
  await cardService.deleteCard(cardId)
  res.status(204).send()
})

export default router
