import { Router, Request, Response } from 'express'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { z } from 'zod'
import { requireAuth, AuthRequest } from '../middleware/auth'
import * as userRepo from '../repositories/userRepository'

const router = Router()

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
})

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// POST /users/register
router.post('/register', async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    return
  }
  const { email, password, name } = parsed.data
  const hashed = await bcrypt.hash(password, 10)
  const user = await userRepo.createUser(email, hashed, name)
  res.status(201).json(user)
})

// POST /users/login
router.post('/login', async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    return
  }
  const { email, password } = parsed.data
  const user = await userRepo.findUserByEmail(email)
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }
  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }
  const secret = process.env.JWT_SECRET!
  const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '7d' })
  res.json({ token })
})

// GET /users/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const user = await userRepo.findUserById(parseInt(req.params.id))
  if (!user) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(user)
})

export default router

