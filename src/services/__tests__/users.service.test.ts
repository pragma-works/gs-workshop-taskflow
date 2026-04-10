import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createUserService } from '../users.service'
import type { IUserRepository, IPasswordHasher, ITokenProvider } from '../../interfaces/repositories'

const makeRepo = (): IUserRepository => ({
  create: vi.fn(),
  findByEmail: vi.fn(),
  findById: vi.fn(),
})

const makeHasher = (): IPasswordHasher => ({
  hash: vi.fn(),
  compare: vi.fn(),
})

const makeTokenProvider = (): ITokenProvider => ({
  sign: vi.fn(),
  verify: vi.fn(),
})

describe('UserService', () => {
  let repo: ReturnType<typeof makeRepo>
  let hasher: ReturnType<typeof makeHasher>
  let tokens: ReturnType<typeof makeTokenProvider>

  beforeEach(() => {
    repo = makeRepo()
    hasher = makeHasher()
    tokens = makeTokenProvider()
  })

  describe('register', () => {
    it('hashes the password before storing', async () => {
      vi.mocked(hasher.hash).mockResolvedValue('hashed')
      vi.mocked(repo.create).mockResolvedValue({ id: 1, email: 'a@b.com', name: 'A' } as any)

      const service = createUserService(repo, hasher, tokens)
      await service.register({ email: 'a@b.com', password: 'plain', name: 'A' })

      expect(hasher.hash).toHaveBeenCalledWith('plain')
      expect(repo.create).toHaveBeenCalledWith({ email: 'a@b.com', password: 'hashed', name: 'A' })
    })

    it('returns the created user without password', async () => {
      vi.mocked(hasher.hash).mockResolvedValue('hashed')
      const safeUser = { id: 1, email: 'a@b.com', name: 'A' }
      vi.mocked(repo.create).mockResolvedValue(safeUser as any)

      const service = createUserService(repo, hasher, tokens)
      const result = await service.register({ email: 'a@b.com', password: 'plain', name: 'A' })

      expect(result).toEqual(safeUser)
    })
  })

  describe('login', () => {
    it('throws UnauthorizedError if user not found', async () => {
      vi.mocked(repo.findByEmail).mockResolvedValue(null)

      const service = createUserService(repo, hasher, tokens)
      await expect(service.login({ email: 'x@x.com', password: 'pw' })).rejects.toThrow('Invalid credentials')
    })

    it('throws UnauthorizedError if password does not match', async () => {
      vi.mocked(repo.findByEmail).mockResolvedValue({ id: 1, email: 'a@b.com', password: 'hashed', name: 'A' } as any)
      vi.mocked(hasher.compare).mockResolvedValue(false)

      const service = createUserService(repo, hasher, tokens)
      await expect(service.login({ email: 'a@b.com', password: 'wrong' })).rejects.toThrow('Invalid credentials')
    })

    it('returns a token on success', async () => {
      vi.mocked(repo.findByEmail).mockResolvedValue({ id: 1, email: 'a@b.com', password: 'hashed', name: 'A' } as any)
      vi.mocked(hasher.compare).mockResolvedValue(true)
      vi.mocked(tokens.sign).mockReturnValue('jwt-token')

      const service = createUserService(repo, hasher, tokens)
      const result = await service.login({ email: 'a@b.com', password: 'correct' })

      expect(tokens.sign).toHaveBeenCalledWith({ userId: 1 })
      expect(result.token).toBe('jwt-token')
    })

    it('returns the user without password on success', async () => {
      vi.mocked(repo.findByEmail).mockResolvedValue({ id: 1, email: 'a@b.com', password: 'hashed', name: 'A' } as any)
      vi.mocked(hasher.compare).mockResolvedValue(true)
      vi.mocked(tokens.sign).mockReturnValue('jwt-token')

      const service = createUserService(repo, hasher, tokens)
      const result = await service.login({ email: 'a@b.com', password: 'correct' })

      expect(result.user).not.toHaveProperty('password')
      expect(result.user).toMatchObject({ id: 1, email: 'a@b.com', name: 'A' })
    })
  })

  describe('getProfile', () => {
    it('returns user if found', async () => {
      const safeUser = { id: 1, email: 'a@b.com', name: 'A' }
      vi.mocked(repo.findById).mockResolvedValue(safeUser as any)

      const service = createUserService(repo, hasher, tokens)
      const result = await service.getProfile(1)

      expect(result).toEqual(safeUser)
    })

    it('throws NotFoundError if user not found', async () => {
      vi.mocked(repo.findById).mockResolvedValue(null)

      const service = createUserService(repo, hasher, tokens)
      await expect(service.getProfile(99)).rejects.toThrow('User not found')    })
  })
})
