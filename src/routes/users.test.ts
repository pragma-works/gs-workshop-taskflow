import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { loadTestContext, resetDatabase } from '../test/integration-helpers'

let app: Awaited<ReturnType<typeof loadTestContext>>['app']
let prisma: Awaited<ReturnType<typeof loadTestContext>>['prisma']

beforeAll(async () => {
  const context = await loadTestContext()
  app = context.app
  prisma = context.prisma
})

beforeEach(async () => {
  await resetDatabase(prisma)
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('users', () => {
  it('registers a user without exposing the password hash', async () => {
    const response = await request(app)
      .post('/users/register')
      .send({ email: 'alice@test.com', password: 'password123', name: 'Alice' })

    expect(response.status).toBe(201)
    expect(response.body.email).toBe('alice@test.com')
    expect(response.body.name).toBe('Alice')
    expect(response.body.password).toBeUndefined()
  })

  it('returns public user fields without exposing the password hash', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'alice@test.com',
        password: 'hashed-password',
        name: 'Alice',
      },
    })

    const response = await request(app).get(`/users/${user.id}`)

    expect(response.status).toBe(200)
    expect(response.body.id).toBe(user.id)
    expect(response.body.email).toBe('alice@test.com')
    expect(response.body.password).toBeUndefined()
  })
})