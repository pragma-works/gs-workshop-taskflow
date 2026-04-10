import { Router } from 'express'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { getUserId, requireAuth } from '../auth'
import { config } from '../config'
import prisma from '../db'
import { AppError, asyncHandler } from '../errors'
import { publicUserSelect, toPublicUser } from '../serializers'
import { parsePositiveInt, requireEmail, requireString } from '../validation'

const router = Router()

// POST /users/register
router.post('/register', asyncHandler(async (req, res) => {
  const email = requireEmail(req.body.email, 'email')
  const password = requireString(req.body.password, 'password', { minLength: 8, maxLength: 128 })
  const name = requireString(req.body.name, 'name', { minLength: 1, maxLength: 100 })

  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existingUser) {
    throw new AppError(409, 'Email already in use')
  }

  const hashedPassword = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name },
    select: publicUserSelect,
  })

  res.status(201).json(toPublicUser(user))
}))

// POST /users/login
router.post('/login', asyncHandler(async (req, res) => {
  const email = requireEmail(req.body.email, 'email')
  const password = requireString(req.body.password, 'password', { minLength: 8, maxLength: 128 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    throw new AppError(401, 'Invalid credentials')
  }

  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) {
    throw new AppError(401, 'Invalid credentials')
  }

  const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '7d' })
  res.json({ token, user: toPublicUser(user) })
}))

// GET /users/:id
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const requesterId = getUserId(req)
  const userId = parsePositiveInt(req.params.id, 'user id')
  if (requesterId !== userId) {
    throw new AppError(403, 'Forbidden')
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect })
  if (!user) {
    throw new AppError(404, 'User not found')
  }

  res.json(toPublicUser(user))
}))

export default router
