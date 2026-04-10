import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../index'
import { createUser } from '../test/helpers'

describe('POST /users/register', () => {
  it('creates a user and returns user data', async () => {
    const res = await request(app)
      .post('/users/register')
      .send({ email: 'alice@example.com', password: 'secret', name: 'Alice' })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ email: 'alice@example.com', name: 'Alice' })
  })
})

describe('POST /users/login', () => {
  it('returns a token for valid credentials', async () => {
    await createUser({ email: 'login@example.com', password: 'pass123' })
    const res = await request(app)
      .post('/users/login')
      .send({ email: 'login@example.com', password: 'pass123' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
  })

  it('returns 401 for wrong password', async () => {
    await createUser({ email: 'badpass@example.com', password: 'correct' })
    const res = await request(app)
      .post('/users/login')
      .send({ email: 'badpass@example.com', password: 'wrong' })
    expect(res.status).toBe(401)
  })

  it('returns 401 for unknown email', async () => {
    const res = await request(app)
      .post('/users/login')
      .send({ email: 'nobody@example.com', password: 'any' })
    expect(res.status).toBe(401)
  })
})

describe('GET /users/:id', () => {
  it('returns the user', async () => {
    const user = await createUser()
    const res = await request(app).get(`/users/${user.id}`)
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: user.id, email: user.email })
  })

  it('returns 404 for unknown user', async () => {
    const res = await request(app).get('/users/99999')
    expect(res.status).toBe(404)
  })
})
