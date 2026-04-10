import { Router } from 'express'
import * as bcrypt from 'bcryptjs'

import { signUserToken } from '../lib/auth'
import { asyncHandler } from '../lib/asyncHandler'
import { HttpError } from '../lib/errors'
import { parseIdParam, parseRequiredString, readObjectBody } from '../lib/validation'
import { createUser, findUserByEmail, findUserById } from '../repositories/usersRepository'

const router = Router()

function toPublicUser<T extends { password: string }>(user: T): Omit<T, 'password'> {
  const { password, ...publicUser } = user
  return publicUser
}

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const body = readObjectBody(req.body)
    const email = parseRequiredString(body.email, 'email')
    const password = parseRequiredString(body.password, 'password')
    const name = parseRequiredString(body.name, 'name')
    const hashed = await bcrypt.hash(password, 10)
    const user = await createUser({ email, password: hashed, name })
    res.json(toPublicUser(user))
  }),
)

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const body = readObjectBody(req.body)
    const email = parseRequiredString(body.email, 'email')
    const password = parseRequiredString(body.password, 'password')
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
    const userId = parseIdParam(req.params.id, 'user id')
    const user = await findUserById(userId)
    if (!user) {
      throw new HttpError(404, 'Not found')
    }

    res.json(toPublicUser(user))
  }),
)

export default router
