import { Router, Request, Response } from 'express'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import prisma from '../db'
import { verifyToken, JWT_SECRET } from '../lib/auth'

const router = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
})

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
})

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// POST /users/register
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors })
    return
  }
  const { email, password, name } = parsed.data
  const hashed = await bcrypt.hash(password, 12)
  const { password: _pw, ...user } = await prisma.user.create({
    data: { email, password: hashed, name },
  })
  res.json(user)
})

// POST /users/login
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors })
    return
  }
  const { email, password } = parsed.data
  const user = await prisma.user.findUnique({ where: { email } })
  // Always run bcrypt.compare to prevent timing-based user enumeration
  const dummyHash = '$2a$12$invalidhashinvalidhashinvalidhashinvalidhashin'
  const valid = await bcrypt.compare(password, user?.password ?? dummyHash)
  if (!user || !valid) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' })
  res.json({ token })
})

// GET /users/:id
router.get('/:id', async (req: Request, res: Response) => {
  let callerId: number
  try {
    callerId = verifyToken(req)
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const id = parseInt(req.params.id)
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid user id' })
    return
  }
  // Users may only retrieve their own profile
  if (callerId !== id) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  const { password: _pw, ...safeUser } = user
  res.json(safeUser)
})

export default router
