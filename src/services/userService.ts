import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { config } from '../config'
import { IUserRepository, IUserService, NotFoundError, UnauthorizedError } from '../types'

function excludePassword(user: { id: number; email: string; password: string; name: string; createdAt: Date }) {
  const { password: _, ...rest } = user
  return rest
}

export function createUserService(userRepo: IUserRepository): IUserService {
  return {
    async register(email: string, password: string, name: string) {
      const hashed = await bcrypt.hash(password, 10)
      const user = await userRepo.create({ email, password: hashed, name })
      return excludePassword(user)
    },

    async login(email: string, password: string) {
      const user = await userRepo.findByEmail(email)
      if (!user) throw new UnauthorizedError('Invalid credentials')

      const valid = await bcrypt.compare(password, user.password)
      if (!valid) throw new UnauthorizedError('Invalid credentials')

      const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '7d' })
      return { token }
    },

    async getById(id: number) {
      const user = await userRepo.findById(id)
      if (!user) throw new NotFoundError('User not found')
      return excludePassword(user)
    },
  }
}
