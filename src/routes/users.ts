import { Router, Request, Response } from 'express'
import { AuthService } from '../services/AuthService'
import { requireAuth, AuthRequest } from '../middleware/auth'

export function createUsersRouter(authService: AuthService) {
  const router = Router()

  router.post('/register', async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body
      const user = await authService.register(email, password, name)
      res.status(201).json(user)
    } catch (err) {
      res.status(400).json({ error: (err as Error).message })
    }
  })

  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body
      const token = await authService.login(email, password)
      res.json({ token })
    } catch {
      res.status(401).json({ error: 'Invalid credentials' })
    }
  })

  router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    const user = await authService.getUser(parseInt(req.params.id))
    if (!user) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    res.json(user)
  })

  return router
}
