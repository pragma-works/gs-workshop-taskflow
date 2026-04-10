import { Router, Request, Response, NextFunction } from 'express'
import { UserService } from '../services/userService'

const router = Router()
const userService = new UserService()

// POST /users/register
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.register(req.body)
    res.json(user)
  } catch (error) {
    next(error)
  }
})

// POST /users/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = await userService.login(req.body)
    res.json(token)
  } catch (error) {
    next(error)
  }
})

// GET /users/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.getUserById(parseInt(req.params.id, 10))
    res.json(user)
  } catch (error) {
    next(error)
  }
})

export default router
