process.env.DATABASE_URL = `file:./dev-${Date.now()}-${Math.floor(Math.random()*1e6)}.db`
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import request from 'supertest'
import app from '../index'
import prisma from '../db'

describe('integration activity endpoints', () => {
  beforeAll(async () => {
    await prisma.activityEvent.deleteMany()
    await prisma.comment.deleteMany()
    await prisma.cardLabel.deleteMany()
    await prisma.card.deleteMany()
    await prisma.list.deleteMany()
    await prisma.boardMember.deleteMany()
    await prisma.board.deleteMany()
    await prisma.user.deleteMany()
  })

  afterAll(async () => {
    await prisma.activityEvent.deleteMany()
    await prisma.comment.deleteMany()
    await prisma.cardLabel.deleteMany()
    await prisma.card.deleteMany()
    await prisma.list.deleteMany()
    await prisma.boardMember.deleteMany()
    await prisma.board.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  it('records move and comment and preview works', async () => {
    // Register and login
    const reg = await request(app).post('/users/register').send({ email: 'int@example.com', password: 'pass123', name: 'Int' }).expect(200)
    const login = await request(app).post('/users/login').send({ email: 'int@example.com', password: 'pass123' }).expect(200)
    const token = login.body.token

    // Create board
    const boardRes = await request(app).post('/boards').set('Authorization', `Bearer ${token}`).send({ name: 'Board X' }).expect(201)
    const boardId = boardRes.body.id

    // Create lists and a card directly via prisma
    const listA = await prisma.list.create({ data: { name: 'A', position: 0, boardId } })
    const listB = await prisma.list.create({ data: { name: 'B', position: 1, boardId } })
    const card = await prisma.card.create({ data: { title: 'Card1', position: 0, listId: listA.id, assigneeId: reg.body.id } })

    // Move card via API (should create activity)
    await request(app).patch(`/cards/${card.id}/move`).set('Authorization', `Bearer ${token}`).send({ targetListId: listB.id, position: 0 }).expect(200)

    // Add comment via API (should create activity)
    await request(app).post(`/cards/${card.id}/comments`).set('Authorization', `Bearer ${token}`).send({ content: 'hello' }).expect(201)

    // Preview (no auth)
    const preview = await request(app).get(`/boards/${boardId}/activity/preview`).expect(200)
    expect(Array.isArray(preview.body.events)).toBe(true)
    expect(preview.body.events.length).toBeGreaterThanOrEqual(2)
    const hasParsedPreview = preview.body.events.some((ev: any) => typeof ev.meta === 'object')
    expect(hasParsedPreview).toBe(true)

    // Full feed (auth required)
    const full = await request(app).get(`/boards/${boardId}/activity`).set('Authorization', `Bearer ${token}`).expect(200)
    expect(Array.isArray(full.body.events)).toBe(true)
    expect(full.body.events.length).toBeGreaterThanOrEqual(2)
    const hasParsedFull = full.body.events.some((ev: any) => typeof ev.meta === 'object')
    expect(hasParsedFull).toBe(true)

    // Ownership checks: create another user and ensure only owner can add members
    const reg2 = await request(app).post('/users/register').send({ email: 'other@example.com', password: 'pass123', name: 'Other' }).expect(200)
    const login2 = await request(app).post('/users/login').send({ email: 'other@example.com', password: 'pass123' }).expect(200)
    const token2 = login2.body.token

    // Owner (token) can add other as member
    await request(app).post(`/boards/${boardId}/members`).set('Authorization', `Bearer ${token}`).send({ memberId: reg2.body.id }).expect(201)

    // Non-owner (token2) cannot add new members
    const reg3 = await request(app).post('/users/register').send({ email: 'third@example.com', password: 'pass123', name: 'Third' }).expect(200)
    await request(app).post(`/boards/${boardId}/members`).set('Authorization', `Bearer ${token2}`).send({ memberId: reg3.body.id }).expect(403)
  })
})
