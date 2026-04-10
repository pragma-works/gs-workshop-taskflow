import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { IUserRepository } from '../repositories/IUserRepository'

export class AuthService {
  constructor(private readonly users: IUserRepository) {}

  async register(email: string, password: string, name: string) {
    const hashed = await bcrypt.hash(password, 10)
    const user = await this.users.create({ email, password: hashed, name })
    const { password: _, ...safe } = user
    return safe
  }

  async login(email: string, password: string): Promise<string> {
    const user = await this.users.findByEmail(email)
    if (!user) throw new Error('Invalid credentials')
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) throw new Error('Invalid credentials')
    const secret = process.env.JWT_SECRET ?? 'super-secret-key-change-me'
    return jwt.sign({ userId: user.id }, secret, { expiresIn: '7d' })
  }

  async getUser(id: number) {
    const user = await this.users.findById(id)
    if (!user) return null
    const { password: _, ...safe } = user
    return safe
  }
}
