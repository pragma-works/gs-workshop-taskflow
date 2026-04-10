import { Router, Request, Response } from 'express'
import * as jwt from 'jsonwebtoken'
import {
  findCardById, countCardsByList, createCard, findListById,
  moveCardWithActivity, createComment, deleteCard,
  findCommentsByCard, findCardLabelsByCard, findLabelById
} from '../repository'

const router = Router()

function verifyToken(req: Request): number {
  const header = req.headers.authorization
  if (!header) throw new Error('No auth header')
  const token = header.replace('Bearer ', '')
  const payload = jwt.verify(token, 'super-secret-key-change-me') as { userId: number }
  return payload.userId
}

// GET /cards/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const card = await findCardById(parseInt(req.params.id))
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  const comments = await findCommentsByCard(card.id)
  const cardLabels = await findCardLabelsByCard(card.id)
  const labels = []
  for (const cl of cardLabels) {
    const label = await findLabelById(cl.labelId)
    labels.push(label)
  }
  res.json({ ...card, comments, labels })
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
  const count = await countCardsByList(listId)
  const card = await createCard({ title, description, listId, assigneeId, position: count })
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
    const card = await findCardById(cardId)
    if (!card) {
      res.status(404).json({ error: 'Not found' })
      return
    }

    const fromListId = card.listId

    const targetList = await findListById(targetListId)
    if (!targetList) {
      res.status(404).json({ error: 'Target list not found' })
      return
    }

    const event = await moveCardWithActivity(
      cardId, targetListId, position, userId, targetList.boardId, fromListId
    )

    res.json({ ok: true, event })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: 'Move failed', details: message })
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
  const comment = await createComment({ content, cardId, userId })
  res.status(201).json(comment)
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
  await deleteCard(cardId)
  res.json({ ok: true })
})

export default router
