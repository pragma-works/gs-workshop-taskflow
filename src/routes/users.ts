import { Router, Request, Response } from 'express'
import * as userService from '../services/user.service'

const router = Router()

// POST /users/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name } = req.body
  const user = await userService.register({ email, password, name })
  res.json(user)
})

// POST /users/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    const result = await userService.login(email, password)
    res.json(result)
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

// GET /users/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await userService.getUser(parseInt(req.params.id))
    res.json(user)
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

export default router
