import { Router, Request, Response, NextFunction } from 'express'
import { getContainer } from '../container'
import { authenticate } from '../middleware/auth'
import { AuthRequest, BadRequestError } from '../types'

const router = Router()

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body
    if (!email || !password || !name) throw new BadRequestError('email, password, and name are required')
    const user = await getContainer().userService.register(email, password, name)
    res.status(201).json(user)
  } catch (err) {
    next(err)
  }
})

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body
    if (!email || !password) throw new BadRequestError('email and password are required')
    const result = await getContainer().userService.login(email, password)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await getContainer().userService.getById(parseInt(req.params.id))
    res.json(user)
  } catch (err) {
    next(err)
  }
})

export default router
