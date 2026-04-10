import { Router, Request, Response } from 'express'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../auth'
import { PrismaUserRepository } from '../repositories/PrismaUserRepository'

const router    = Router()
const userRepo  = new PrismaUserRepository()

// POST /users/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name } = req.body
  const hashed = await bcrypt.hash(password, 10)
  const user   = await userRepo.create({ email, password: hashed, name })
  res.json(user)
})

// POST /users/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body
  const user = await userRepo.findByEmail(email)
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }
  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }
  const token = jwt.sign({ userId: user.id, name: user.name }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ token })
})

// GET /users/:id
router.get('/:id', async (req: Request, res: Response) => {
  const user = await userRepo.findById(parseInt(req.params.id))
  if (!user) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(user)
})

export default router
