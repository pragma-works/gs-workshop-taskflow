import { Router } from 'express'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import * as repo from '../repositories'
import { verifyToken } from '../middleware/auth'

const router = Router()

// POST /users/register
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body
  const hashed = await bcrypt.hash(password, 10)
  const user = await repo.createUser({ email, password: hashed, name })
  const safe = { id: user.id, email: user.email, name: user.name }
  res.json(safe)
})

// POST /users/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  const user = await repo.findUserByEmail(email)
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }
  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }
  const secret = process.env.JWT_SECRET || 'super-secret-key-change-me'
  const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '7d' })
  res.json({ token })
})

// GET /users/:id
router.get('/:id', async (req, res) => {
  const user = await repo.findUserById(parseInt(req.params.id))
  if (!user) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  const safe = { id: user.id, email: user.email, name: user.name }
  res.json(safe)
})

export default router
