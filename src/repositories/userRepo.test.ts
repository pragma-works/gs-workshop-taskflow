import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as userRepo from './userRepo'
import prisma from '../db'

vi.mock('../db', () => ({
  default: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
    }
  }
}))

describe('userRepo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createUser calls prisma.user.create', async () => {
    const data = { email: 'a', password: 'b', name: 'c' }
    await userRepo.createUser(data)
    expect(prisma.user.create).toHaveBeenCalledWith({ data })
  })

  it('findUserByEmail calls prisma.user.findUnique', async () => {
    await userRepo.findUserByEmail('a@b.com')
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'a@b.com' } })
  })

  it('findUserById calls prisma.user.findUnique', async () => {
    await userRepo.findUserById(1)
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } })
  })
})
