import { Router, Request, Response } from 'express'
import * as bcrypt from 'bcryptjs'
import { signToken } from '../auth'
import { createUser, findUserByEmail, findUserById } from '../repositories/taskflow'

const router = Router()

function toPublicUser<T extends { password: string }>(user: T): Omit<T, 'password'> {
  const { password: _password, ...publicUser } = user
  return publicUser
}

// POST /users/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name } = req.body
  const hashed = await bcrypt.hash(password, 10)
  const user = await createUser({ email, password: hashed, name })
  res.json(toPublicUser(user))
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
  res.json(toPublicUser(user))
})

export default router
