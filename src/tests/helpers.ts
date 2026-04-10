import { execSync } from 'child_process'
import supertest from 'supertest'
import prisma from '../db'
import app from '../index'

/** Supertest agent — shares the Express app; no port binding needed. */
export const agent = supertest(app)

/**
 * Reset + provision the test DB and seed it.
 * --force-reset drops all tables before applying the schema, so repeated runs
 * never hit unique-constraint violations from a previous seed.
 */
export function provisionDb(): void {
  execSync('npx prisma db push --accept-data-loss --skip-generate --force-reset', { stdio: 'pipe' })
  execSync('npx ts-node prisma/seed.ts', { stdio: 'pipe' })
}

/** Login and return a JWT for the given credentials. */
export async function getToken(email: string, password: string): Promise<string> {
  const res = await agent
    .post('/users/login')
    .send({ email, password })
    .set('Content-Type', 'application/json')
  return (res.body as { token: string }).token
}

/**
 * Create a one-off user, return their id + token.
 * Caller is responsible for cleaning up with prisma.user.delete.
 */
export async function createTempUser(
  email: string,
  name: string,
): Promise<{ id: number; token: string }> {
  const res = await agent
    .post('/users/register')
    .send({ email, password: 'pass123', name })
    .set('Content-Type', 'application/json')
  const id = (res.body as { id: number }).id
  const token = await getToken(email, 'pass123')
  return { id, token }
}

/** Insert a bare ActivityEvent directly (bypasses HTTP layer — for read tests). */
export function seedEvent(overrides: Partial<{
  boardId: number
  cardId: number
  userId: number
  eventType: string
  cardTitle: string
  fromListName: string | null
  toListName: string | null
  createdAt: Date
}> = {}) {
  return prisma.activityEvent.create({
    data: {
      boardId:     1,
      cardId:      1,
      userId:      1,
      eventType:   'card_moved',
      cardTitle:   'User auth flow',
      fromListName: 'Backlog',
      toListName:  'In Progress',
      ...overrides,
    },
  })
}

export { prisma }
