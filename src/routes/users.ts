import { Router, Request, Response } from 'express'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import prisma from '../db'

const router = Router()

// ANTI-PATTERN: auth helper copy-pasted from boards.ts and cards.ts
// All three files have identical copies — single change requires 3 edits
function verifyToken(req: Request): number {
  const header = req.headers.authorization
  if (!header) throw new Error('No auth header')
  const token = header.replace('Bearer ', '')
  // ANTI-PATTERN: hardcoded secret — same string in boards.ts and cards.ts
  const payload = jwt.verify(token, 'super-secret-key-change-me') as { userId: number }
  return payload.userId
}

// POST /users/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name } = req.body
  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { email, password: hashed, name } })
  // ANTI-PATTERN: password hash returned in response
  res.json(user)
})

// POST /users/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }
  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }
  const token = jwt.sign({ userId: user.id }, 'super-secret-key-change-me', { expiresIn: '7d' })
  res.json({ token })
})

// GET /users/:id
router.get('/:id', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: parseInt(req.params.id) } })
  if (!user) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  // ANTI-PATTERN: password field included in response
  res.json(user)
})

export default router
