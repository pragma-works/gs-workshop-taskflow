import { Router, Request, Response } from 'express'
import { asyncHandler } from '../http'
import { getUserById, loginUser, registerUser } from '../services/user-service'
import { idParamSchema, loginUserSchema, parseWithSchema, registerUserSchema } from '../validation'

const router = Router()

// POST /users/register
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name } = parseWithSchema(registerUserSchema, req.body)
  const user = await registerUser(email, password, name)
  res.status(201).json(user)
}))

// POST /users/login
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = parseWithSchema(loginUserSchema, req.body)
  const result = await loginUser(email, password)
  res.json(result)
}))

// GET /users/:id
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = parseWithSchema(idParamSchema, req.params)
  const user = await getUserById(id)
  res.json(user)
}))

export default router
