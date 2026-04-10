import { Router, Request, Response } from 'express'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { z } from 'zod'
import prisma from '../db'
import { config } from '../config'
import { validateBody, validateParams } from '../middleware/validation'

const router = Router()

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

// POST /users/register
router.post('/register', validateBody(registerSchema), async (req: Request, res: Response) => {
  const { email, password, name } = req.body
  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { email, password: hashed, name } })
  res.json({ id: user.id, email: user.email, name: user.name, createdAt: user.createdAt })
})

// POST /users/login
router.post('/login', validateBody(loginSchema), async (req: Request, res: Response) => {
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
  const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] })
  res.json({ token })
})

// GET /users/:id
router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) } })
  if (!user) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json({ id: user.id, email: user.email, name: user.name, createdAt: user.createdAt })
})

export default router
