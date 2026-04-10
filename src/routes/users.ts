import { Router, Request, Response } from 'express'
import * as userService from '../services/userService'

const router = Router()

// POST /users/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name } = req.body
  const user = await userService.registerUser(email, password, name)
  res.json(user)
})

// POST /users/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body
  try {
    const result = await userService.loginUser(email, password)
    res.json(result)
  } catch {
    res.status(401).json({ error: 'Invalid credentials' })
  }
})

// GET /users/:id
router.get('/:id', async (req: Request, res: Response) => {
  const user = await userService.getUserById(parseInt(req.params.id))
  if (!user) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(user)
})

export default router
