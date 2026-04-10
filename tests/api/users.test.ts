import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'

import { createTestContext, type TestContext } from '../support/test-context'

describe('user registration', () => {
  let testContext: TestContext | undefined

  afterEach(async () => {
    if (testContext) {
      await testContext.cleanup()
      testContext = undefined
    }
  })

  it('returns public user fields without the password hash when a caller registers', async () => {
    testContext = await createTestContext('users-register')

    const response = await request(testContext.app).post('/users/register').send({
      email: 'new-user@test.com',
      password: 'password123',
      name: 'New User',
    })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      email: 'new-user@test.com',
      name: 'New User',
    })
    expect(response.body.password).toBeUndefined()
  })

  it('returns public user fields without the password hash when a caller fetches a user', async () => {
    testContext = await createTestContext('users-get')

    const user = await testContext.prisma.user.create({
      data: {
        email: 'existing-user@test.com',
        password: 'hashed-password',
        name: 'Existing User',
      },
    })

    const response = await request(testContext.app).get(`/users/${user.id}`)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      id: user.id,
      email: 'existing-user@test.com',
      name: 'Existing User',
    })
    expect(response.body.password).toBeUndefined()
  })
})
