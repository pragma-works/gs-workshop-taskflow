import { Router, Response } from 'express'
import * as bcrypt from 'bcryptjs'
import { signToken } from '../middleware/auth'
import * as userRepo from '../repositories/userRepository'

const router = Router()

// POST /users/register
router.post('/register', async (req, res: Response) => {
  const { email, password, name } = req.body
  const user = await userRepo.createUser(email, password, name)
  res.json(user)
})

// POST /users/login
router.post('/login', async (req, res: Response) => {
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
})

// GET /users/:id
router.get('/:id', async (req, res: Response) => {
  const user = await userRepo.findById(parseInt(req.params.id))
  if (!user) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(user)
})

export default router
