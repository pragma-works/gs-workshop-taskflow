import { Router, Response } from 'express'
import { handleError, parseIntParam } from '../middleware/routeHelpers'
import { validateBody } from '../middleware/validate'
import { getUserProfile, loginUser, registerUser } from '../services/taskflowService'

const router = Router()

// POST /users/register
router.post('/register', async (req, res: Response) => {
  try {
    const body = validateBody<{ email: string; password: string; name: string }>(req.body, {
      email: { type: 'string', min: 3, max: 320 },
      password: { type: 'string', min: 8, max: 128 },
      name: { type: 'string', min: 1, max: 100 },
    })
    const user = await registerUser(body)
    res.json(user)
  } catch (error: unknown) {
    handleError(res, error)
  }
})

// POST /users/login
router.post('/login', async (req, res: Response) => {
  try {
    const body = validateBody<{ email: string; password: string }>(req.body, {
      email: { type: 'string', min: 1, max: 320 },
      password: { type: 'string', min: 1, max: 128 },
    })
    const payload = await loginUser(body)
    res.json(payload)
  } catch (error: unknown) {
    handleError(res, error)
  }
})

// GET /users/:id
router.get('/:id', async (req, res: Response) => {
  try {
    const user = await getUserProfile(parseIntParam(req.params.id))
    res.json(user)
  } catch (error: unknown) {
    handleError(res, error)
  }
})

export default router
