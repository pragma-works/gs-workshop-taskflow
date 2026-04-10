import { Router, Request, Response } from 'express'
import * as bcrypt from 'bcryptjs'
import { signToken } from '../middleware/auth'
import userRepo from '../repositories/UserRepository'

const router = Router()

// GET /users - List all users
router.get('/', async (req: Request, res: Response) => {
  try {
    const users = await userRepo.findAll()
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get users', details: (error as Error).message })
  }
})

// POST /users/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body
    const hashed = await bcrypt.hash(password, 10)
    const user = await userRepo.create(email, hashed, name)
    res.json({ id: user.id, email: user.email, name: user.name, createdAt: user.createdAt })
  } catch (error) {
    res.status(500).json({ error: 'Registration failed', details: (error as Error).message })
  }
})

// POST /users/login
router.post('/login', async (req: Request, res: Response) => {
  try {
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
    const token = signToken(user.id)
    res.json({ token })
  } catch (error) {
    res.status(500).json({ error: 'Login failed', details: (error as Error).message })
  }
})

// GET /users/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await userRepo.findById(parseInt(req.params.id))
    if (!user) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user', details: (error as Error).message })
  }
})

export default router
