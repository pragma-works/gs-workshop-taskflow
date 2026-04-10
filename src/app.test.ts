import { execSync } from 'child_process'
import { existsSync, rmSync } from 'fs'
import { join } from 'path'
import type { Express } from 'express'
import request from 'supertest'
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const ROOT = process.cwd()
const TEST_DATABASE_URL = 'file:./test.db'
const TEST_DATABASE_PATH = join(ROOT, 'prisma', 'test.db')
let app: Express
let databaseClient: { $disconnect(): Promise<void> }

function resetDatabase(): void {
  if (existsSync(TEST_DATABASE_PATH)) {
    rmSync(TEST_DATABASE_PATH)
  }

  execSync('npm run db:push', {
    cwd: ROOT,
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL,
    },
    stdio: 'pipe',
  })

  execSync('npm run db:seed', {
    cwd: ROOT,
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL,
    },
    stdio: 'pipe',
  })
}

async function bootApplication(): Promise<void> {
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = TEST_DATABASE_URL
  process.env.JWT_SECRET = 'test-secret'
  vi.resetModules()

  const appModule = await import('./app')
  const dbModule = await import('./db')

  app = appModule.createApp()
  databaseClient = dbModule.default
}

async function login(email: string, password: string): Promise<string> {
  const response = await request(app)
    .post('/users/login')
    .send({ email, password })

  expect(response.status).toBe(200)
  expect(typeof response.body.token).toBe('string')

  return response.body.token
}

async function registerAndLoginUser(email: string, password: string, name: string): Promise<string> {
  const registerResponse = await request(app)
    .post('/users/register')
    .send({ email, password, name })

  expect(registerResponse.status).toBe(200)
  expect(registerResponse.body).not.toHaveProperty('password')

  return login(email, password)
}

beforeEach(async () => {
  resetDatabase()
  await bootApplication()
})

afterEach(async () => {
  if (databaseClient) {
    await databaseClient.$disconnect()
  }
})

afterAll(() => {
  if (existsSync(TEST_DATABASE_PATH)) {
    rmSync(TEST_DATABASE_PATH)
  }
})

describe('taskflow api', () => {
  test('registers users without exposing password hashes and authenticates with JWT', async () => {
    const token = await registerAndLoginUser('dave@test.com', 'password123', 'Dave')

    expect(token.length).toBeGreaterThan(10)

    const userResponse = await request(app).get('/users/4')

    expect(userResponse.status).toBe(200)
    expect(userResponse.body).toMatchObject({
      id: 4,
      email: 'dave@test.com',
      name: 'Dave',
    })
    expect(userResponse.body).not.toHaveProperty('password')
  })

  test('lists boards and returns nested board details for authenticated members', async () => {
    const token = await login('alice@test.com', 'password123')

    const boardsResponse = await request(app)
      .get('/boards')
      .set('Authorization', `Bearer ${token}`)

    expect(boardsResponse.status).toBe(200)
    expect(boardsResponse.body).toHaveLength(1)
    expect(boardsResponse.body[0]).toMatchObject({
      id: 1,
      name: 'Q2 Product Sprint',
    })

    const boardResponse = await request(app)
      .get('/boards/1')
      .set('Authorization', `Bearer ${token}`)

    expect(boardResponse.status).toBe(200)
    expect(boardResponse.body).toMatchObject({
      id: 1,
      name: 'Q2 Product Sprint',
    })
    expect(boardResponse.body.lists).toHaveLength(3)
    expect(boardResponse.body.lists[0].cards[0]).toMatchObject({
      id: 1,
      title: 'User auth flow',
    })
    expect(boardResponse.body.lists[0].cards[0].comments.length).toBeGreaterThan(0)
    expect(boardResponse.body.lists[0].cards[0].labels.length).toBeGreaterThan(0)
  })

  test('creates boards and only owners can add members', async () => {
    const ownerToken = await login('alice@test.com', 'password123')
    const outsiderToken = await registerAndLoginUser('erin@test.com', 'password123', 'Erin')

    const createBoardResponse = await request(app)
      .post('/boards')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Partner Board' })

    expect(createBoardResponse.status).toBe(201)
    expect(createBoardResponse.body).toMatchObject({
      id: 2,
      name: 'Partner Board',
    })

    const forbiddenAddMemberResponse = await request(app)
      .post('/boards/2/members')
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ memberId: 2 })

    expect(forbiddenAddMemberResponse.status).toBe(403)

    const ownerAddMemberResponse = await request(app)
      .post('/boards/2/members')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ memberId: 2 })

    expect(ownerAddMemberResponse.status).toBe(201)
    expect(ownerAddMemberResponse.body).toEqual({ ok: true })
  })

  test('enforces the activity feed auth and not-found contract', async () => {
    const outsiderToken = await registerAndLoginUser('frank@test.com', 'password123', 'Frank')
    const memberToken = await login('alice@test.com', 'password123')

    const unauthorizedResponse = await request(app).get('/boards/1/activity')
    expect(unauthorizedResponse.status).toBe(401)

    const forbiddenResponse = await request(app)
      .get('/boards/1/activity')
      .set('Authorization', `Bearer ${outsiderToken}`)

    expect(forbiddenResponse.status).toBe(403)

    const notFoundResponse = await request(app)
      .get('/boards/999/activity')
      .set('Authorization', `Bearer ${memberToken}`)

    expect(notFoundResponse.status).toBe(404)
  })

  test('records move and comment activity and returns the updated card on move', async () => {
    const token = await login('alice@test.com', 'password123')

    const moveResponse = await request(app)
      .patch('/cards/1/move')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetListId: 2, position: 0 })

    expect(moveResponse.status).toBe(200)
    expect(moveResponse.body).toMatchObject({
      id: 1,
      listId: 2,
      position: 0,
    })
    expect(Array.isArray(moveResponse.body.comments)).toBe(true)
    expect(Array.isArray(moveResponse.body.labels)).toBe(true)

    const commentResponse = await request(app)
      .post('/cards/1/comments')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Need follow-up after the move' })

    expect(commentResponse.status).toBe(201)
    expect(commentResponse.body).toMatchObject({
      cardId: 1,
      userId: 1,
      content: 'Need follow-up after the move',
    })

    const activityResponse = await request(app)
      .get('/boards/1/activity')
      .set('Authorization', `Bearer ${token}`)

    expect(activityResponse.status).toBe(200)
    expect(activityResponse.body.events[0]).toMatchObject({
      boardId: 1,
      cardId: 1,
      userId: 1,
      action: 'comment_added',
      meta: {
        cardTitle: 'User auth flow',
        contentPreview: 'Need follow-up after the move',
      },
    })
    expect(activityResponse.body.events[1]).toMatchObject({
      boardId: 1,
      cardId: 1,
      userId: 1,
      action: 'card_moved',
      meta: {
        fromListId: 1,
        fromListName: 'Backlog',
        toListId: 2,
        toListName: 'In Progress',
        position: 0,
      },
    })
  })

  test('limits the public activity preview to the last 10 events in newest-first order', async () => {
    const token = await login('alice@test.com', 'password123')

    for (let index = 0; index < 11; index += 1) {
      const commentResponse = await request(app)
        .post('/cards/1/comments')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: `preview comment ${index}` })

      expect(commentResponse.status).toBe(201)
    }

    const previewResponse = await request(app).get('/boards/1/activity/preview')

    expect(previewResponse.status).toBe(200)
    expect(previewResponse.body.events).toHaveLength(10)
    expect(previewResponse.body.events[0]).toMatchObject({
      action: 'comment_added',
      meta: {
        contentPreview: 'preview comment 10',
      },
    })
    expect(previewResponse.body.events[9]).toMatchObject({
      action: 'comment_added',
      meta: {
        contentPreview: 'preview comment 1',
      },
    })
  })

  test('creates, reads and deletes cards only for board members', async () => {
    const memberToken = await login('alice@test.com', 'password123')
    const outsiderToken = await registerAndLoginUser('gina@test.com', 'password123', 'Gina')

    const createCardResponse = await request(app)
      .post('/cards')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ title: 'API contract tests', description: 'Add regression coverage', listId: 1 })

    expect(createCardResponse.status).toBe(201)
    expect(createCardResponse.body).toMatchObject({
      id: 6,
      title: 'API contract tests',
      description: 'Add regression coverage',
      listId: 1,
    })

    const forbiddenReadResponse = await request(app)
      .get('/cards/6')
      .set('Authorization', `Bearer ${outsiderToken}`)

    expect(forbiddenReadResponse.status).toBe(403)

    const readCardResponse = await request(app)
      .get('/cards/6')
      .set('Authorization', `Bearer ${memberToken}`)

    expect(readCardResponse.status).toBe(200)
    expect(readCardResponse.body).toMatchObject({
      id: 6,
      title: 'API contract tests',
    })

    const deleteCardResponse = await request(app)
      .delete('/cards/6')
      .set('Authorization', `Bearer ${memberToken}`)

    expect(deleteCardResponse.status).toBe(200)
    expect(deleteCardResponse.body).toEqual({ ok: true })

    const missingCardResponse = await request(app)
      .get('/cards/6')
      .set('Authorization', `Bearer ${memberToken}`)

    expect(missingCardResponse.status).toBe(404)
  })
})
