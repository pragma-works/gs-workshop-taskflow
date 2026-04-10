import { execSync } from 'child_process'
import * as bcrypt from 'bcryptjs'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

let app: typeof import('./index').default
let db: typeof import('./db').default

interface SeededContext {
  ownerId: number
  memberId: number
  outsiderId: number
  boardId: number
  fromListId: number
  targetListId: number
  cardId: number
}

function shell(command: string): void {
  execSync(command, {
    stdio: 'pipe',
    env: {
      ...process.env,
      DATABASE_URL: 'file:./test.db',
      JWT_SECRET: 'test-secret',
      NODE_ENV: 'test',
    },
  })
}

async function seedCoreData(): Promise<SeededContext> {
  const password = await bcrypt.hash('password123', 10)

  const owner = await db.user.create({
    data: { email: 'owner@test.com', password, name: 'Owner' },
  })

  const member = await db.user.create({
    data: { email: 'member@test.com', password, name: 'Member' },
  })

  const outsider = await db.user.create({
    data: { email: 'outsider@test.com', password, name: 'Outsider' },
  })

  const board = await db.board.create({ data: { name: 'Board A' } })

  await db.boardMember.createMany({
    data: [
      { boardId: board.id, userId: owner.id, role: 'owner' },
      { boardId: board.id, userId: member.id, role: 'member' },
    ],
  })

  const fromList = await db.list.create({
    data: { boardId: board.id, name: 'Backlog', position: 0 },
  })

  const targetList = await db.list.create({
    data: { boardId: board.id, name: 'Done', position: 1 },
  })

  const card = await db.card.create({
    data: { title: 'Card A', listId: fromList.id, position: 0 },
  })

  return {
    ownerId: owner.id,
    memberId: member.id,
    outsiderId: outsider.id,
    boardId: board.id,
    fromListId: fromList.id,
    targetListId: targetList.id,
    cardId: card.id,
  }
}

async function login(email: string): Promise<string> {
  const response = await request(app)
    .post('/users/login')
    .send({ email, password: 'password123' })

  return response.body.token as string
}

describe('Activity Feed', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = 'file:./test.db'
    process.env.JWT_SECRET = 'test-secret'

    shell('npx prisma db push --skip-generate')

    const dbModule = await import('./db')
    const appModule = await import('./index')
    db = dbModule.default
    app = appModule.default
  })

  beforeEach(async () => {
    await db.activityEvent.deleteMany()
    await db.comment.deleteMany()
    await db.cardLabel.deleteMany()
    await db.card.deleteMany()
    await db.list.deleteMany()
    await db.boardMember.deleteMany()
    await db.board.deleteMany()
    await db.user.deleteMany()
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  it('returns preview feed without auth', async () => {
    const context = await seedCoreData()

    await db.activityEvent.createMany({
      data: [
        { boardId: context.boardId, userId: context.ownerId, action: 'comment_added' },
        { boardId: context.boardId, userId: context.memberId, action: 'card_moved' },
      ],
    })

    const response = await request(app).get(`/boards/${context.boardId}/activity/preview`)

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body.events)).toBe(true)
    expect(response.body.events).toHaveLength(2)
  })

  it('returns 401 for private feed without auth', async () => {
    const context = await seedCoreData()

    const response = await request(app).get(`/boards/${context.boardId}/activity`)

    expect(response.status).toBe(401)
  })

  it('returns 403 for private feed when user is not a board member', async () => {
    const context = await seedCoreData()
    const outsiderToken = await login('outsider@test.com')

    const response = await request(app)
      .get(`/boards/${context.boardId}/activity`)
      .set('Authorization', `Bearer ${outsiderToken}`)

    expect(response.status).toBe(403)
  })

  it('writes card_moved and comment_added events from card endpoints', async () => {
    const context = await seedCoreData()
    const token = await login('owner@test.com')

    const moveResponse = await request(app)
      .post(`/cards/${context.cardId}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send({ targetListId: context.targetListId, position: 0 })

    const commentResponse = await request(app)
      .post(`/cards/${context.cardId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Looks good' })

    const feedResponse = await request(app)
      .get(`/boards/${context.boardId}/activity`)
      .set('Authorization', `Bearer ${token}`)

    expect(moveResponse.status).toBe(200)
    expect(commentResponse.status).toBe(201)
    expect(feedResponse.status).toBe(200)

    const actions = (feedResponse.body.events as Array<{ action: string }>).map((event) => event.action)
    expect(actions).toContain('card_moved')
    expect(actions).toContain('comment_added')
  })
})
