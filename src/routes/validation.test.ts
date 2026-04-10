import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createToken, loadTestContext, resetDatabase, seedBoardFixture } from '../test/integration-helpers'

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

describe('request validation', () => {
  it('rejects invalid registration payloads with a 400 response', async () => {
    const response = await request(app)
      .post('/users/register')
      .send({ email: 'not-an-email', password: '123', name: '' })

    expect(response.status).toBe(400)
    expect(response.body.error).toBeTruthy()
  })

  it('rejects invalid board identifiers before querying the database', async () => {
    const fixture = await seedBoardFixture(prisma)
    const token = createToken(fixture.user.id)

    const response = await request(app)
      .get('/boards/not-a-number/activity')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(400)
    expect(response.body.error).toBeTruthy()
  })

  it('rejects invalid card movement payloads with a 400 response', async () => {
    const fixture = await seedBoardFixture(prisma)
    const token = createToken(fixture.user.id)

    const response = await request(app)
      .patch(`/cards/${fixture.card.id}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send({ targetListId: 0, position: -1 })

    expect(response.status).toBe(400)
    expect(response.body.error).toBeTruthy()
  })

  it('rejects empty comments with a 400 response', async () => {
    const fixture = await seedBoardFixture(prisma)
    const token = createToken(fixture.user.id)

    const response = await request(app)
      .post(`/cards/${fixture.card.id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '   ' })

    expect(response.status).toBe(400)
    expect(response.body.error).toBeTruthy()
  })
})