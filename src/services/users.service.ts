import type { IUserRepository, IPasswordHasher, ITokenProvider, SafeUser } from '../interfaces/repositories'
import { UnauthorizedError, NotFoundError } from '../types'
import type { RegisterDto, LoginDto } from '../types'

export type UserService = {
  register(dto: RegisterDto): Promise<SafeUser>
  login(dto: LoginDto): Promise<{ token: string; user: SafeUser }>
  getProfile(userId: number): Promise<SafeUser>
}

export function createUserService(
  repo: IUserRepository,
  hasher: IPasswordHasher,
  tokens: ITokenProvider
): UserService {
  return {
    async register(dto) {
      const hashed = await hasher.hash(dto.password)
      return repo.create({ email: dto.email, password: hashed, name: dto.name })
    },

    async login(dto) {
      const user = await repo.findByEmail(dto.email)
      if (!user) throw new UnauthorizedError('Invalid credentials')

      const valid = await hasher.compare(dto.password, user.password)
      if (!valid) throw new UnauthorizedError('Invalid credentials')

      const token = tokens.sign({ userId: user.id })
      const { password: _pw, ...safeUser } = user
      return { token, user: safeUser as SafeUser }
    },

    async getProfile(userId) {
      const user = await repo.findById(userId)
      if (!user) throw new NotFoundError('User')
      return user
    },
  }
}
