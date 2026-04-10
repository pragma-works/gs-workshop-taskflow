import { Router, Request, Response, NextFunction } from 'express'
import prisma from '../db'
import { verifyToken } from '../auth'

const router = Router()

// GET /cards/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const card = await prisma.card.findUnique({ where: { id: parseInt(req.params.id) } })
  if (!card) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  const comments = await prisma.comment.findMany({ where: { cardId: card.id } })
  // ANTI-PATTERN: N+1 for labels
  const cardLabels = await prisma.cardLabel.findMany({ where: { cardId: card.id } })
  const labels = []
  for (const cl of cardLabels) {
    const label = await prisma.label.findUnique({ where: { id: cl.labelId } })
    labels.push(label)
  }
  res.json({ ...card, comments, labels })
})

// POST /cards — create card
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const { title, description, listId, assigneeId } = req.body

    const list = await prisma.list.findUnique({ where: { id: listId } })
    if (!list) {
      res.status(400).json({ error: 'List not found' })
      return
    }

    const count = await prisma.card.count({ where: { listId } })

    const card = await prisma.$transaction(async (tx) => {
      const card = await tx.card.create({
        data: { title, description, listId, assigneeId, position: count },
      })
      await tx.activityEvent.create({
        data: {
          boardId:     list.boardId,
          cardId:      card.id,
          userId,
          eventType:   'card_created',
          cardTitle:   card.title,
          toListName:  list.name,
        },
      })
      return card
    })

    res.status(201).json(card)
  } catch (err) {
    next(err)
  }
})

// PATCH /cards/:id/move — move card to different list
router.patch('/:id/move', async (req: Request, res: Response, next: NextFunction) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const cardId = parseInt(req.params.id)
    const { targetListId, position } = req.body

    const card = await prisma.card.findUnique({ where: { id: cardId } })
    if (!card) {
      res.status(404).json({ error: 'Not found' })
      return
    }

    const fromListId = card.listId
    const [fromList, toList] = await Promise.all([
      prisma.list.findUnique({ where: { id: fromListId } }),
      prisma.list.findUnique({ where: { id: targetListId } }),
    ])
    if (!toList) {
      res.status(400).json({ error: 'Target list not found' })
      return
    }

    await prisma.$transaction([
      prisma.card.update({ where: { id: cardId }, data: { listId: targetListId, position } }),
      prisma.activityEvent.create({
        data: {
          boardId:      toList.boardId,
          cardId,
          userId,
          eventType:    'card_moved',
          cardTitle:    card.title,
          fromListName: fromList?.name ?? String(fromListId),
          toListName:   toList.name,
        },
      }),
    ])

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// POST /cards/:id/comments — add comment
router.post('/:id/comments', async (req: Request, res: Response, next: NextFunction) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const { content } = req.body
    const cardId = parseInt(req.params.id)

    const card = await prisma.card.findUnique({ where: { id: cardId }, include: { list: true } })
    if (!card) {
      res.status(404).json({ error: 'Not found' })
      return
    }

    const comment = await prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({ data: { content, cardId, userId } })
      await tx.activityEvent.create({
        data: {
          boardId:   card.list.boardId,
          cardId,
          userId,
          eventType: 'card_commented',
          cardTitle: card.title,
        },
      })
      return comment
    })

    res.status(201).json(comment)
  } catch (err) {
    next(err)
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
  // ANTI-PATTERN: no ownership check — any authenticated user can delete any card
  await prisma.card.delete({ where: { id: cardId } })
  res.json({ ok: true })
})

export default router
