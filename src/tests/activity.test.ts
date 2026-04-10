/**
 * Integration tests for the Activity Feed feature.
 * Runner : Node 20 built-in `node:test` (no extra framework).
 * DB     : isolated SQLite test.db, set via env-setup.js --require.
 * HTTP   : Node 20 built-in fetch against a real Express server.
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import prisma from '../db'
import app from '../index'

// ─── Server lifecycle ────────────────────────────────────────────────────────

let server: http.Server
let base: string
let aliceToken: string

before(async () => {
  // Provision test DB from current schema then seed it.
  execSync('npx prisma db push --accept-data-loss --skip-generate', { stdio: 'pipe' })
  execSync('npx ts-node prisma/seed.ts', { stdio: 'pipe' })

  // Bind to a random OS-assigned port so we never collide with the dev server.
  server = http.createServer(app)
  await new Promise<void>(resolve => server.listen(0, resolve))
  base = `http://localhost:${(server.address() as AddressInfo).port}`

  // Obtain a token for alice (used across all suites).
  const res = await fetch(`${base}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alice@test.com', password: 'password123' }),
  })
  aliceToken = ((await res.json()) as { token: string }).token
})

after(async () => {
  server.close()
  await prisma.$disconnect()
})

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function getJSON(path: string, token?: string) {
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${base}${path}`, { headers })
  return { status: res.status, body: await res.json() }
}

async function patchJSON(path: string, body: unknown, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${base}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  })
  return { status: res.status, body: await res.json() }
}

// ─── Suite 1: GET /boards/:id/activity ──────────────────────────────────────

describe('GET /boards/:id/activity', () => {
  before(async () => {
    await prisma.activityEvent.deleteMany()
  })

  it('returns 401 without auth token', async () => {
    const { status, body } = await getJSON('/boards/1/activity')
    assert.equal(status, 401)
    assert.equal((body as { error: string }).error, 'Unauthorized')
  })

  it('returns 200 with empty array when no events exist', async () => {
    const { status, body } = await getJSON('/boards/1/activity', aliceToken)
    assert.equal(status, 200)
    assert.deepEqual(body, [])
  })

  it('returns 403 for a user who is not a board member', async () => {
    // Register a user who has no board membership
    const reg = await fetch(`${base}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'outsider@test.com', password: 'pass123', name: 'Outsider' }),
    })
    const { id: outsiderId } = (await reg.json()) as { id: number }
    const login = await fetch(`${base}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'outsider@test.com', password: 'pass123' }),
    })
    const { token: outsiderToken } = (await login.json()) as { token: string }

    const { status, body } = await getJSON('/boards/1/activity', outsiderToken)
    assert.equal(status, 403)
    assert.equal((body as { error: string }).error, 'Not a board member')

    await prisma.user.delete({ where: { id: outsiderId } })
  })

  it('returns events sorted descending by timestamp', async () => {
    const t1 = new Date('2024-01-01T10:00:00Z')
    const t2 = new Date('2024-01-01T10:00:01Z')
    await prisma.activityEvent.create({
      data: { boardId: 1, cardId: 1, userId: 1, eventType: 'card_created', cardTitle: 'First', toListName: 'Backlog', createdAt: t1 },
    })
    await prisma.activityEvent.create({
      data: { boardId: 1, cardId: 2, userId: 1, eventType: 'card_created', cardTitle: 'Second', toListName: 'Backlog', createdAt: t2 },
    })

    const { status, body } = await getJSON('/boards/1/activity', aliceToken)
    assert.equal(status, 200)
    const events = body as Array<{ timestamp: string; cardTitle: string }>
    assert.equal(events.length, 2)
    assert.ok(
      new Date(events[0].timestamp) >= new Date(events[1].timestamp),
      'Events must be in descending timestamp order',
    )
    assert.equal(events[0].cardTitle, 'Second')
    assert.equal(events[1].cardTitle, 'First')
  })

  it('returned event shape includes actorName, actorId, and cardTitle', async () => {
    await prisma.activityEvent.deleteMany()
    await prisma.activityEvent.create({
      data: { boardId: 1, cardId: 1, userId: 1, eventType: 'card_moved', cardTitle: 'User auth flow', fromListName: 'Backlog', toListName: 'In Progress' },
    })

    const { status, body } = await getJSON('/boards/1/activity', aliceToken)
    assert.equal(status, 200)
    const [event] = body as Array<Record<string, unknown>>
    assert.equal(event['actorName'],  'Alice')
    assert.equal(event['actorId'],    1)
    assert.equal(event['cardTitle'],  'User auth flow')
    assert.equal(event['eventType'],  'card_moved')
    assert.ok('timestamp' in event,   'event must have a timestamp field')
    assert.ok('boardId'   in event,   'event must have boardId')
    assert.ok('cardId'    in event,   'event must have cardId')
  })
})

// ─── Suite 2: GET /boards/:id/activity/preview ──────────────────────────────

describe('GET /boards/:id/activity/preview', () => {
  before(async () => {
    await prisma.activityEvent.deleteMany()
  })

  it('returns 200 without any auth token', async () => {
    const { status, body } = await getJSON('/boards/1/activity/preview')
    assert.equal(status, 200)
    assert.ok(Array.isArray(body), 'body must be an array')
  })

  it('returns the same events as the authenticated endpoint', async () => {
    await prisma.activityEvent.create({
      data: { boardId: 1, cardId: 1, userId: 1, eventType: 'card_commented', cardTitle: 'User auth flow' },
    })

    const { body: preview } = await getJSON('/boards/1/activity/preview')
    const { body: authed }  = await getJSON('/boards/1/activity', aliceToken)
    assert.deepEqual(preview, authed)
  })
})

// ─── Suite 3: PATCH /cards/:id/move + ActivityEvent atomicity ───────────────

describe('PATCH /cards/:id/move + activity event', () => {
  before(async () => {
    await prisma.activityEvent.deleteMany()
    // Put card 1 in a known state (Backlog = list 1) before move tests.
    await prisma.card.update({ where: { id: 1 }, data: { listId: 1, position: 0 } })
  })

  it('returns 401 without auth token', async () => {
    const { status, body } = await patchJSON('/cards/1/move', { targetListId: 2, position: 0 })
    assert.equal(status, 401)
    assert.equal((body as { error: string }).error, 'Unauthorized')
  })

  it('card.listId changes in DB after successful move', async () => {
    const { status } = await patchJSON('/cards/1/move', { targetListId: 2, position: 0 }, aliceToken)
    assert.equal(status, 200)

    const card = await prisma.card.findUniqueOrThrow({ where: { id: 1 } })
    assert.equal(card.listId, 2, 'card must be in the target list after move')
  })

  it('inserts exactly one card_moved ActivityEvent', async () => {
    await prisma.activityEvent.deleteMany()
    await prisma.card.update({ where: { id: 1 }, data: { listId: 1, position: 0 } })

    await patchJSON('/cards/1/move', { targetListId: 2, position: 0 }, aliceToken)

    const events = await prisma.activityEvent.findMany()
    assert.equal(events.length, 1)
    assert.equal(events[0].eventType, 'card_moved')
  })

  it('event records correct fromListName and toListName', async () => {
    await prisma.activityEvent.deleteMany()
    await prisma.card.update({ where: { id: 1 }, data: { listId: 1, position: 0 } })

    await patchJSON('/cards/1/move', { targetListId: 3, position: 0 }, aliceToken)

    const event = await prisma.activityEvent.findFirstOrThrow()
    assert.equal(event.fromListName, 'Backlog',   'fromListName must be the source list')
    assert.equal(event.toListName,   'Done',      'toListName must be the destination list')
  })

  it('feed response includes actorName and cardTitle for the move event', async () => {
    await prisma.activityEvent.deleteMany()
    await prisma.card.update({ where: { id: 1 }, data: { listId: 1, position: 0 } })

    await patchJSON('/cards/1/move', { targetListId: 2, position: 0 }, aliceToken)

    const { body } = await getJSON('/boards/1/activity', aliceToken)
    const [event] = body as Array<Record<string, unknown>>
    assert.equal(event['actorName'], 'Alice')
    assert.equal(event['cardTitle'], 'User auth flow')
  })

  it('returns 400 when targetListId does not exist', async () => {
    const { status, body } = await patchJSON('/cards/1/move', { targetListId: 9999, position: 0 }, aliceToken)
    assert.equal(status, 400)
    assert.equal((body as { error: string }).error, 'Target list not found')
  })
})
