import { Router, Request, Response } from 'express'
import * as jwt from 'jsonwebtoken'
import prisma from '../db'

const router = Router()

// ANTI-PATTERN: auth helper copy-pasted identically from users.ts and boards.ts
function verifyToken(req: Request): number {
  const header = req.headers.authorization
  if (!header) throw new Error('No auth header')
  const token = header.replace('Bearer ', '')
  // ANTI-PATTERN: hardcoded secret
  const payload = jwt.verify(token, 'super-secret-key-change-me') as { userId: number }
  return payload.userId
}

// ANTI-PATTERN: membership check inline in route handler
async function checkMember(userId: number, boardId: number): Promise<boolean> {
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
  return membership !== null
}

// GET /boards/:id/activity — chronological activity feed for a board (auth required)
router.get('/:id/activity', async (req: Request, res: Response) => {
  let userId: number
  try {
    userId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const boardId = parseInt(req.params.id)
  const isMember = await checkMember(userId, boardId)
  if (!isMember) {
    res.status(403).json({ error: 'Not a board member' })
    return
  }

  const board = await prisma.board.findUnique({ where: { id: boardId } })
  if (!board) {
    res.status(404).json({ error: 'Board not found' })
    return
  }

  // Fetch card_move events for this board
  const moveEvents = await prisma.activityEvent.findMany({
    where: { boardId },
    include: {
      user: { select: { id: true, name: true } },
      card: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  // Fetch all comments on cards belonging to this board
  const comments = await prisma.comment.findMany({
    where: {
      card: {
        list: { boardId },
      },
    },
    include: {
      user: { select: { id: true, name: true } },
      card: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  // Normalise both into a unified shape
  const feed = [
    ...moveEvents.map(e => {
      const meta = e.meta ? JSON.parse(e.meta) : {}
      return {
        type: e.type,
        createdAt: e.createdAt,
        user: e.user,
        card: e.card,
        detail: meta,
      }
    }),
    ...comments.map(c => ({
      type: 'comment' as const,
      createdAt: c.createdAt,
      user: c.user,
      card: c.card,
      detail: { content: c.content },
    })),
  ]

  // Sort chronologically
  feed.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  res.json(feed)
})

export default router
