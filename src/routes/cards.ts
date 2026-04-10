import { Router } from 'express'
import { verifyToken } from '../middleware/auth'
import * as repo from '../repositories'

const router = Router()

// GET /cards/:id
router.get('/:id', async (req, res) => {
  try {
    verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const card = await repo.findCardById(parseInt(req.params.id))
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  const comments = await repo.findCommentsByCard(card.id)
  const cardLabels = await repo.findCardLabelsByCard(card.id)
  const labels = []
  for (const cl of cardLabels) {
    const label = await repo.findLabelById(cl.labelId)
    labels.push(label)
  }
  res.json({ ...card, comments, labels })
})

// POST /cards — create card
router.post('/', async (req, res) => {
  try {
    verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { title, description, listId, assigneeId } = req.body
  const count = await repo.countCardsInList(listId)
  const card = await repo.createCard({ title, description, listId, assigneeId, position: count })
  res.status(201).json(card)
})

// PATCH /cards/:id/move — move card to different list
router.patch('/:id/move', async (req, res) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const cardId = parseInt(req.params.id)
  const { targetListId, position } = req.body

  const card = await repo.findCardById(cardId)
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  await repo.moveCardWithActivity(cardId, targetListId, position, userId)

  res.json({ ok: true })
})

// POST /cards/:id/comments — add comment
router.post('/:id/comments', async (req, res) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { content } = req.body
  const cardId = parseInt(req.params.id)
  const comment = await repo.createCommentWithActivity({ content, cardId, userId })
  res.status(201).json(comment)
})

// DELETE /cards/:id
router.delete('/:id', async (req, res) => {
  try {
    verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const cardId = parseInt(req.params.id)
  await repo.deleteCard({ id: cardId })
  res.json({ ok: true })
})

export default router
