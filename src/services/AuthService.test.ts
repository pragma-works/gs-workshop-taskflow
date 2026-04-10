import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthService } from './AuthService'
import type { IUserRepository } from '../repositories/IUserRepository'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'

vi.mock('bcryptjs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('bcryptjs')>()
  return {
    ...actual,
    hash: vi.fn(),
    compare: vi.fn(),
  }
})

vi.mock('jsonwebtoken', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jsonwebtoken')>()
  return {
    ...actual,
    sign: vi.fn(),
  }
})

function makeMockUserRepo(): IUserRepository {
  return {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
  }
}

describe('AuthService', () => {
  let userRepo: IUserRepository
  let authService: AuthService

  beforeEach(() => {
    userRepo = makeMockUserRepo()
    authService = new AuthService(userRepo)
    vi.clearAllMocks()
  })

  describe('register', () => {
    it('hashes password and returns user without password field', async () => {
      vi.mocked(bcrypt.hash).mockResolvedValueOnce('hashed_pw' as never)
      const mockUser = { id: 1, email: 'alice@example.com', name: 'Alice', password: 'hashed_pw', createdAt: new Date() }
      vi.mocked(userRepo.create).mockResolvedValueOnce(mockUser)

      const result = await authService.register('alice@example.com', 'plaintext', 'Alice')

      expect(bcrypt.hash).toHaveBeenCalledWith('plaintext', 10)
      expect(userRepo.create).toHaveBeenCalledWith({ email: 'alice@example.com', password: 'hashed_pw', name: 'Alice' })
      expect(result).not.toHaveProperty('password')
      expect(result).toMatchObject({ id: 1, email: 'alice@example.com', name: 'Alice' })
    })
  })

  describe('login', () => {
    it('returns a JWT token on valid credentials', async () => {
      const mockUser = { id: 2, email: 'bob@example.com', name: 'Bob', password: 'hashed', createdAt: new Date() }
      vi.mocked(userRepo.findByEmail).mockResolvedValueOnce(mockUser)
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never)
      vi.mocked(jwt.sign).mockReturnValueOnce('jwt.token.here' as never)

      const token = await authService.login('bob@example.com', 'correct_pw')

      expect(token).toBe('jwt.token.here')
      expect(jwt.sign).toHaveBeenCalledWith({ userId: 2 }, expect.any(String), { expiresIn: '7d' })
    })

    it('throws when user is not found', async () => {
      vi.mocked(userRepo.findByEmail).mockResolvedValueOnce(null)

      await expect(authService.login('unknown@example.com', 'pw')).rejects.toThrow('Invalid credentials')
    })

    it('throws when password is incorrect', async () => {
      const mockUser = { id: 3, email: 'carol@example.com', name: 'Carol', password: 'hashed', createdAt: new Date() }
      vi.mocked(userRepo.findByEmail).mockResolvedValueOnce(mockUser)
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never)

      await expect(authService.login('carol@example.com', 'wrong_pw')).rejects.toThrow('Invalid credentials')
    })
  })

  describe('getUser', () => {
    it('returns user without password when found', async () => {
      const mockUser = { id: 1, email: 'alice@example.com', name: 'Alice', password: 'hashed', createdAt: new Date() }
      vi.mocked(userRepo.findById).mockResolvedValueOnce(mockUser)

      const result = await authService.getUser(1)

      expect(result).not.toHaveProperty('password')
      expect(result).toMatchObject({ id: 1, email: 'alice@example.com' })
    })

    it('returns null when user not found', async () => {
      vi.mocked(userRepo.findById).mockResolvedValueOnce(null)

      const result = await authService.getUser(999)

      expect(result).toBeNull()
    })
  })
})
