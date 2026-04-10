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

async function buildActivityFeed(boardId: number) {
  const moveEvents = await prisma.activityEvent.findMany({
    where: { boardId },
    include: {
      user: { select: { id: true, name: true } },
      card: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const comments = await prisma.comment.findMany({
    where: { card: { list: { boardId } } },
    include: {
      user: { select: { id: true, name: true } },
      card: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const feed = [
    ...moveEvents.map(e => ({
      type: e.type,
      createdAt: e.createdAt,
      user: e.user,
      card: e.card,
      detail: e.meta ? JSON.parse(e.meta) : {},
    })),
    ...comments.map(c => ({
      type: 'comment' as const,
      createdAt: c.createdAt,
      user: c.user,
      card: c.card,
      detail: { content: c.content },
    })),
  ]

  feed.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  return feed
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

  res.json(await buildActivityFeed(boardId))
})

// GET /boards/:id/activity/preview — no-auth testing endpoint
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)

  const board = await prisma.board.findUnique({ where: { id: boardId } })
  if (!board) {
    res.status(404).json({ error: 'Board not found' })
    return
  }

  res.json(await buildActivityFeed(boardId))
})

export default router
