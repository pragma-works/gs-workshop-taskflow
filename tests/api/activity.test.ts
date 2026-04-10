import request from 'supertest'
import { describe, expect, it } from 'vitest'

import app from '../../src/index'

describe('board activity feed', () => {
  it('returns 401 when an unauthenticated caller requests board activity', async () => {
    const response = await request(app).get('/boards/1/activity')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'Unauthorized' })
  })
})
