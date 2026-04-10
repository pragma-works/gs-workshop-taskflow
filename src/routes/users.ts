import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../middleware/authenticate'
import { validate } from '../middleware/validate'
import { registerSchema, loginSchema } from '../schemas/users.schema'
import type { UserService } from '../services/users.service'

export function createUsersRouter(service: UserService) {
  const router = Router()

  router.post('/register', validate(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await service.register(req.body)
      res.json(user)
    } catch (err) {
      next(err)
    }
  })

  router.post('/login', validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await service.login(req.body)
      res.json(result)
    } catch (err) {
      next(err)
    }
  })

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await service.getProfile(parseInt(req.params.id))
      res.json(user)
    } catch (err) {
      next(err)
    }
  })

  return router
}

// Backward-compatible default export using concrete repos
import { createUser, findUserByEmail, findUserById } from '../repositories/users.repo'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { config } from '../config'
import { createUserService } from '../services/users.service'

const defaultRepo = { create: createUser, findByEmail: findUserByEmail, findById: findUserById }
const defaultHasher = {
  hash: (plain: string) => bcrypt.hash(plain, 10),
  compare: bcrypt.compare.bind(bcrypt),
}
const defaultTokens = {
  sign: (payload: object) => jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn }),
  verify: (token: string) => jwt.verify(token, config.jwtSecret) as { userId: number },
}

export default createUsersRouter(createUserService(defaultRepo as any, defaultHasher, defaultTokens))
