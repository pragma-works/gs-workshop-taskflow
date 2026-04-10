import { Router, Request, Response } from 'express'
import * as bcrypt from 'bcryptjs'
import prisma from '../db'
import { signAuthToken } from '../middleware/auth'

const router = Router()

function toPublicUser(user: { id: number; email: string; name: string; createdAt: Date }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  }
}

// POST /users/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name } = req.body
  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { email, password: hashed, name } })
  res.json(toPublicUser(user))
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
  const token = signAuthToken(user.id)
  res.json({ token })
})

// GET /users/:id
router.get('/:id', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id)
  if (Number.isNaN(userId)) {
    res.status(400).json({ error: 'Invalid user id' })
    return
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, createdAt: true },
  })
  if (!user) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  res.json(user)
})

export default router
