import { Router, Request, Response } from 'express'
import { asyncHandler } from '../middleware/async-handler'
import { getUserProfile, loginUser, registerUser } from '../services/users-service'
import { parseId } from '../services/http-input'

const router = Router()

// POST /users/register
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const user = await registerUser(req.body)
  res.json(user)
}))

// POST /users/login
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const result = await loginUser(req.body)
  res.json(result)
}))

// GET /users/:id
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = parseId(req.params.id, 'id')
  const user = await getUserProfile(userId)
  res.json(user)
}))

export default router
