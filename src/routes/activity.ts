import { Router, Request, Response } from 'express'
import * as jwt from 'jsonwebtoken'
import prisma from '../db'

const router = Router()

function verifyToken(req: Request): number {
  const header = req.headers.authorization
  if (!header) throw new Error('No auth header')
  const token = header.replace('Bearer ', '')
  const payload = jwt.verify(token, 'super-secret-key-change-me') as { userId: number }
  return payload.userId
}

// GET /boards/:id/activity — authenticated, chronological (oldest first)
router.get('/:id/activity', async (req: Request, res: Response) => {
  try {
    verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const boardId = parseInt(req.params.id)
  const events = await prisma.activityEvent.findMany({
    where:   { boardId },
    orderBy: { createdAt: 'asc' },
  })
  res.json(events)
})

// GET /boards/:id/activity/preview — no-auth testing endpoint, newest first
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)
  const events = await prisma.activityEvent.findMany({
    where:   { boardId },
    orderBy: { createdAt: 'desc' },
  })
  res.json(events)
})

export default router
