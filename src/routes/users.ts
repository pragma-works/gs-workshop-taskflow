import { Router, Request, Response } from 'express'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../middleware/auth'
import { createUser, findUserByEmail, findUserById } from '../services/userService'

const router = Router()

// POST /users/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name } = req.body
  const hashed = await bcrypt.hash(password, 10)
  const user = await createUser(email, hashed, name)
  const { password: _, ...safeUser } = user
  res.json(safeUser)
})

// POST /users/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body
  const user = await findUserByEmail(email)
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }
  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ token })
})

// GET /users/:id
router.get('/:id', async (req: Request, res: Response) => {
  const user = await findUserById(parseInt(req.params.id))
  if (!user) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  const { password: _, ...safeUser } = user
  res.json(safeUser)
})

export default router
