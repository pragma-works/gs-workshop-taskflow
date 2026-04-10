import { Router, Request, Response } from 'express'
import { registerUser, loginUser, getUserById } from '../repositories/userService'

const router = Router()

// POST /users/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name } = req.body
  const user = await registerUser(email, password, name)
  res.json(user)
})

// POST /users/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body
  const result = await loginUser(email, password)
  if (!result) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }
  res.json(result)
})

// GET /users/:id
router.get('/:id', async (req: Request, res: Response) => {
  const user = await getUserById(parseInt(req.params.id))
  if (!user) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(user)
})

export default router
