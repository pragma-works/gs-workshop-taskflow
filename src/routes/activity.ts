import { Router, Request, Response } from 'express'
import * as jwt from 'jsonwebtoken'
import { findMembership, findActivityEventsForBoard } from '../repository'

const router = Router()

function verifyToken(req: Request): number {
  const header = req.headers.authorization
  if (!header) throw new Error('No auth header')
  const token = header.replace('Bearer ', '')
  const payload = jwt.verify(token, 'super-secret-key-change-me') as { userId: number }
  return payload.userId
}

async function checkMember(userId: number, boardId: number): Promise<boolean> {
  const membership = await findMembership(userId, boardId)
  return membership !== null
}

// GET /boards/:id/activity — authenticated; returns activity events for board
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

  const events = await findActivityEventsForBoard(boardId)
  res.json(events)
})

// GET /boards/:id/activity/preview — no auth required; returns activity events for board
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)

  const events = await findActivityEventsForBoard(boardId)
  res.json(events)
})

export default router
