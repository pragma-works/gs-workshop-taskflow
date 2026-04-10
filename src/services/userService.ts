import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { getJwtSecret } from '../config'
import { HttpError } from '../errors'
import { UserRepository } from '../repositories/userRepository'

const userRepository = new UserRepository()

export class UserService {
  async register(data: { email: string; password: string; name: string }) {
    if (!data.email || !data.password || !data.name) {
      throw new HttpError(400, 'email, password and name are required')
    }

    const hashed = await bcrypt.hash(data.password, 10)
    const user = await userRepository.create({
      email: data.email,
      password: hashed,
      name: data.name,
    })

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    }
  }

  async login(data: { email: string; password: string }) {
    const user = await userRepository.findByEmail(data.email)
    if (!user) {
      throw new HttpError(401, 'Invalid credentials')
    }

    const valid = await bcrypt.compare(data.password, user.password)
    if (!valid) {
      throw new HttpError(401, 'Invalid credentials')
    }

    const token = jwt.sign({ userId: user.id }, getJwtSecret(), { expiresIn: '7d' })
    return { token }
  }

  async getUserById(id: number) {
    const user = await userRepository.findById(id)
    if (!user) {
      throw new HttpError(404, 'Not found')
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    }
  }
}
