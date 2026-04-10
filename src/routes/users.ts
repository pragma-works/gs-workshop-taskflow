import { Router, Request, Response } from 'express'
import * as bcrypt from 'bcryptjs'
import { generateToken } from '../middleware/auth'
import { UserRepository } from '../repositories/user.repository'

const router = Router()
const userRepo = new UserRepository()

// POST /users/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name } = req.body
  const hashed = await bcrypt.hash(password, 10)
  const user = await userRepo.create(email, hashed, name)
  // Don't return password in response
  const { password: _, ...userWithoutPassword } = user
  res.json(userWithoutPassword)
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
  const token = generateToken(user.id)
  res.json({ token })
})

// GET /users/:id
router.get('/:id', async (req: Request, res: Response) => {
  const user = await userRepo.findById(parseInt(req.params.id))
  if (!user) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  // Don't return password in response
  const { password: _, ...userWithoutPassword } = user
  res.json(userWithoutPassword)
})

export default router
