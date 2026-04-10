import { Router, Request, Response } from 'express'
import { verifyToken, AuthRequest } from '../middleware/auth'
import cardRepo from '../repositories/CardRepository'
import boardRepo from '../repositories/BoardRepository'
import commentRepo from '../repositories/CommentRepository'
import prisma from '../db'

const router = Router()

// GET /cards/:id
router.get('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const card = await cardRepo.findById(parseInt(req.params.id))
    if (!card) {
      res.status(404).json({ error: 'Not found' })
      return
    }

    const isMember = await boardRepo.checkMembership(req.userId!, card.list.board.id)
    if (!isMember) {
      res.status(403).json({ error: 'Not authorized' })
      return
    }

    res.json({
      ...card,
      labels: card.labels.map(cl => cl.label)
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get card', details: (error as Error).message })
  }
})

// POST /cards — create card
router.post('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, listId, assigneeId } = req.body
    const position = await cardRepo.count(listId)
    const card = await cardRepo.create(title, description, listId, assigneeId, position)
    res.status(201).json(card)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create card', details: (error as Error).message })
  }
})

// PATCH /cards/:id/move — move card to different list
router.patch('/:id/move', verifyToken, async (req: AuthRequest, res: Response) => {
  const cardId = parseInt(req.params.id)
  const { targetListId, position } = req.body

  try {
    const card = await cardRepo.findById(cardId)
    if (!card) {
      res.status(404).json({ error: 'Not found' })
      return
    }

    const isMember = await boardRepo.checkMembership(req.userId!, card.list.board.id)
    if (!isMember) {
      res.status(403).json({ error: 'Not authorized to move this card' })
      return
    }

    const fromListId = card.listId
    const boardId = card.list.boardId

    const event = await prisma.$transaction(async (tx) => {
      await tx.card.update({
        where: { id: cardId },
        data: { listId: targetListId, position }
      })

      const activityEvent = await tx.activityEvent.create({
        data: {
          boardId,
          actorId: req.userId!,
          eventType: 'card_moved',
          cardId,
          fromListId,
          toListId: targetListId
        }
      })

      return activityEvent
    })

    res.json({ ok: true, event })
  } catch (error) {
    res.status(500).json({ error: 'Move failed', details: (error as Error).message })
  }
})

// POST /cards/:id/comments — add comment
router.post('/:id/comments', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body
    const cardId = parseInt(req.params.id)

    const card = await cardRepo.findById(cardId)
    if (!card) {
      res.status(404).json({ error: 'Card not found' })
      return
    }

    const isMember = await boardRepo.checkMembership(req.userId!, card.list.board.id)
    if (!isMember) {
      res.status(403).json({ error: 'Not authorized' })
      return
    }

    const comment = await commentRepo.create(content, cardId, req.userId!)
    res.status(201).json(comment)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create comment', details: (error as Error).message })
  }
})

// DELETE /cards/:id
router.delete('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const cardId = parseInt(req.params.id)
    const card = await cardRepo.findById(cardId)

    if (!card) {
      res.status(404).json({ error: 'Not found' })
      return
    }

    const isMember = await boardRepo.checkMembership(req.userId!, card.list.board.id)
    if (!isMember) {
      res.status(403).json({ error: 'Not authorized' })
      return
    }

    await cardRepo.delete(cardId)
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete card', details: (error as Error).message })
  }
})

export default router
