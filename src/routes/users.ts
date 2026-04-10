import { Router, Response } from 'express'
import { HttpError } from '../errors/httpError'
import { getUserProfile, loginUser, registerUser } from '../services/taskflowService'

const router = Router()

function parseUserId(value: string): number {
  return Number.parseInt(value, 10)
}

function handleError(res: Response, error: unknown): void {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ error: error.message })
    return
  }

  res.status(500).json({ error: 'Internal server error' })
}

// POST /users/register
router.post('/register', async (req, res: Response) => {
  try {
    const user = await registerUser(req.body)
    res.json(user)
  } catch (error: unknown) {
    handleError(res, error)
  }
})

// POST /users/login
router.post('/login', async (req, res: Response) => {
  try {
    const payload = await loginUser(req.body)
    res.json(payload)
  } catch (error: unknown) {
    handleError(res, error)
  }
})

// GET /users/:id
router.get('/:id', async (req, res: Response) => {
  try {
    const user = await getUserProfile(parseUserId(req.params.id))
    res.json(user)
  } catch (error: unknown) {
    handleError(res, error)
  }
})

export default router
