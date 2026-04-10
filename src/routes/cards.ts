import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { requireAuth, AuthRequest } from '../middleware/auth'
import * as cardRepo from '../repositories/cardRepository'
import * as boardRepo from '../repositories/boardRepository'

const router = Router()

const CreateCardSchema = z.object({
  title:       z.string().min(1),
  listId:      z.number().int().positive(),
  description: z.string().optional(),
  assigneeId:  z.number().int().positive().optional(),
})

const MoveCardSchema = z.object({
  targetListId: z.number().int().positive(),
  position:     z.number().int().min(0),
})

const CommentSchema = z.object({ content: z.string().min(1) })

// GET /cards/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const card = await cardRepo.getCardWithDetails(parseInt(req.params.id))
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(card)
})

// POST /cards — create card
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const parsed = CreateCardSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    return
  }
  const { title, listId, description, assigneeId } = parsed.data
  const card = await cardRepo.createCard(title, listId, description, assigneeId)
  res.status(201).json(card)
})

// PATCH /cards/:id/move — move card to different list (atomic with activity log)
router.patch('/:id/move', requireAuth, async (req: Request, res: Response) => {
  const parsed = MoveCardSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    return
  }
  const userId  = (req as AuthRequest).userId
  const cardId  = parseInt(req.params.id)
  const { targetListId, position } = parsed.data

  const existing = await cardRepo.getCardById(cardId)
  if (!existing) {
    res.status(404).json({ error: 'Card not found' })
    return
  }

  // Verify caller is a member of the board this card belongs to
  const list = await import('../db').then(({ default: prisma }) =>
    prisma.list.findUnique({ where: { id: existing.listId } })
  )
  if (!list) {
    res.status(404).json({ error: 'List not found' })
    return
  }
  const isMember = await boardRepo.isBoardMember(userId, list.boardId)
  if (!isMember) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  try {
    const result = await cardRepo.moveCard(cardId, targetListId, position, userId)
    if (!result) {
      res.status(404).json({ error: 'Card or list not found' })
      return
    }
    res.json({ ok: true, event: result.event })
  } catch (err: any) {
    res.status(500).json({ error: 'Move failed', details: err.message })
  }
})

// POST /cards/:id/comments — add comment
router.post('/:id/comments', requireAuth, async (req: Request, res: Response) => {
  const parsed = CommentSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    return
  }
  const userId  = (req as AuthRequest).userId
  const cardId  = parseInt(req.params.id)
  const comment = await cardRepo.addComment(cardId, userId, parsed.data.content)
  res.status(201).json(comment)
})

// DELETE /cards/:id — only board members can delete
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).userId
  const cardId = parseInt(req.params.id)

  const card = await cardRepo.getCardById(cardId)
  if (!card) {
    res.status(404).json({ error: 'Card not found' })
    return
  }

  const list = await import('../db').then(({ default: prisma }) =>
    prisma.list.findUnique({ where: { id: card.listId } })
  )
  if (!list) {
    res.status(404).json({ error: 'List not found' })
    return
  }
  const isMember = await boardRepo.isBoardMember(userId, list.boardId)
  if (!isMember) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  await cardRepo.deleteCard(cardId)
  res.json({ ok: true })
})

export default router

