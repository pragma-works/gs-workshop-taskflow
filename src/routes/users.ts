import { Router, Request, Response, NextFunction } from 'express'
import { userService } from '../services/userService'
import { authenticate } from '../middleware/auth'
import { AuthRequest } from '../types'

const router = Router()

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body
    const user = await userService.register(email, password, name)
    res.status(201).json(user)
  } catch (err) {
    next(err)
  }
})

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body
    const result = await userService.login(email, password)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await userService.getById(parseInt(req.params.id))
    res.json(user)
  } catch (err) {
    next(err)
  }
})

export default router
