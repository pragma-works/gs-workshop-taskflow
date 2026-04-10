import { Router } from 'express'
import * as bcrypt from 'bcryptjs'

import { signUserToken } from '../lib/auth'
import { asyncHandler } from '../lib/asyncHandler'
import { HttpError } from '../lib/errors'
import { createUser, findUserByEmail, findUserById } from '../repositories/taskflowRepository'

const router = Router()

function toPublicUser<T extends { password: string }>(user: T): Omit<T, 'password'> {
  const { password, ...publicUser } = user
  return publicUser
}

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { email, password, name } = req.body
    const hashed = await bcrypt.hash(password, 10)
    const user = await createUser({ email, password: hashed, name })
    res.json(toPublicUser(user))
  }),
)

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body
    const user = await findUserByEmail(email)
    if (!user) {
      throw new HttpError(401, 'Invalid credentials')
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      throw new HttpError(401, 'Invalid credentials')
    }

    res.json({ token: signUserToken(user.id) })
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await findUserById(Number.parseInt(req.params.id, 10))
    if (!user) {
      throw new HttpError(404, 'Not found')
    }

    res.json(toPublicUser(user))
  }),
)

export default router
