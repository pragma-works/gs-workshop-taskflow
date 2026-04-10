import { Router } from 'express'
import { authenticate } from '../auth'
import { PrismaCardRepository } from '../repositories/PrismaCardRepository'
import { PrismaListRepository } from '../repositories/PrismaListRepository'
import { PrismaUnitOfWork } from '../repositories/PrismaUnitOfWork'
import { CardService } from '../services/CardService'
import prisma from '../db'

// Mounted at /cards in index.ts; all paths here are relative.
const router = Router()

const cardRepo    = new PrismaCardRepository()
const listRepo    = new PrismaListRepository()
const uow         = new PrismaUnitOfWork()
const cardService = new CardService(cardRepo, listRepo, uow)

// GET /cards/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const card = await prisma.card.findUnique({
      where:   { id: Number(req.params.id) },
      include: { assignee: { select: { id: true, name: true, email: true } } },
    })
    if (!card) { res.status(404).json({ error: 'Card not found' }); return }
    res.json(card)
  } catch (err) {
    next(err)
  }
})

// PATCH /cards/:id/move
router.patch('/:id/move', authenticate, async (req, res, next) => {
  try {
    const actor        = (req as any).user
    const cardId       = Number(req.params.id)
    const { targetListId, position } = req.body

    if (!targetListId || position === undefined) {
      res.status(400).json({ error: 'targetListId and position are required' })
      return
    }

    const result = await cardService.moveCard(cardId, Number(targetListId), Number(position), actor)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// DELETE /cards/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.card.delete({ where: { id: Number(req.params.id) } })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

// POST /cards/:id/comments
router.post('/:id/comments', authenticate, async (req, res, next) => {
  try {
    const actor   = (req as any).user
    const cardId  = Number(req.params.id)
    const { content } = req.body

    if (!content) { res.status(400).json({ error: 'content is required' }); return }

    const comment = await cardService.addComment(cardId, content, actor)
    res.status(201).json(comment)
  } catch (err) {
    next(err)
  }
})

export default router
