import { Router, Request, Response } from 'express'
import * as bcrypt from 'bcryptjs'
import { verifyToken, signToken } from '../middleware/auth'
import { createUser, findUserByEmail, findUserById } from '../repositories/userRepo'

const router = Router()

// POST /users/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name } = req.body
  const hashed = await bcrypt.hash(password, 10)
  const user = await createUser({ email, password: hashed, name })
  const { password: _, ...userWithoutPassword } = user
  res.json(userWithoutPassword)
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
  const token = signToken(user.id)
  res.json({ token })
})

// GET /users/:id
router.get('/:id', async (req: Request, res: Response) => {
  const user = await findUserById(parseInt(req.params.id))
  if (!user) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  const { password: _, ...userWithoutPassword } = user
  res.json(userWithoutPassword)
})

export default router
