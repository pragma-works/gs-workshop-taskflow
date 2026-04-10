process.env.DATABASE_URL = `file:./dev-${Date.now()}-${Math.floor(Math.random()*1e6)}.db`
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import request from 'supertest'
import app from '../index'
import prisma from '../db'

describe('route error cases and nested fetch', () => {
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

  it('GET /boards without auth returns 401', async () => {
    await request(app).get('/boards').expect(401)
  })

  it('GET /users/:id for missing user returns 404', async () => {
    await request(app).get('/users/999999').expect(404)
  })

  it('bad login returns 401', async () => {
    await request(app).post('/users/login').send({ email: 'noone@example.com', password: 'x' }).expect(401)
  })

  it('non-member cannot access board details', async () => {
    // owner
    const reg = await request(app).post('/users/register').send({ email: 'owner2@example.com', password: 'pass', name: 'Owner2' }).expect(200)
    const login = await request(app).post('/users/login').send({ email: 'owner2@example.com', password: 'pass' }).expect(200)
    const token = login.body.token
    const boardRes = await request(app).post('/boards').set('Authorization', `Bearer ${token}`).send({ name: 'B1' }).expect(201)
    const boardId = boardRes.body.id

    // another user (not member)
    const reg2 = await request(app).post('/users/register').send({ email: 'outsider@example.com', password: 'pass', name: 'Outsider' }).expect(200)
    const login2 = await request(app).post('/users/login').send({ email: 'outsider@example.com', password: 'pass' }).expect(200)
    const token2 = login2.body.token

    await request(app).get(`/boards/${boardId}`).set('Authorization', `Bearer ${token2}`).expect(403)
  })

  it('card move and comment require auth', async () => {
    // set up owner, board, list, card
    const reg = await request(app).post('/users/register').send({ email: 'authreq@example.com', password: 'pass', name: 'AuthReq' }).expect(200)
    const login = await request(app).post('/users/login').send({ email: 'authreq@example.com', password: 'pass' }).expect(200)
    const token = login.body.token
    const boardRes = await request(app).post('/boards').set('Authorization', `Bearer ${token}`).send({ name: 'B2' }).expect(201)
    const boardId = boardRes.body.id
    const listA = await prisma.list.create({ data: { name: 'A', position: 0, boardId } })
    const listB = await prisma.list.create({ data: { name: 'B', position: 1, boardId } })
    const card = await prisma.card.create({ data: { title: 'CardX', position: 0, listId: listA.id } })

    // no auth -> 401
    await request(app).patch(`/cards/${card.id}/move`).send({ targetListId: listB.id, position: 0 }).expect(401)
    await request(app).post(`/cards/${card.id}/comments`).send({ content: 'hey' }).expect(401)
  })

  it('GET board returns nested lists, cards, comments and labels', async () => {
    const reg = await request(app).post('/users/register').send({ email: 'nested@example.com', password: 'pass', name: 'Nested' }).expect(200)
    const login = await request(app).post('/users/login').send({ email: 'nested@example.com', password: 'pass' }).expect(200)
    const token = login.body.token
    const boardRes = await request(app).post('/boards').set('Authorization', `Bearer ${token}`).send({ name: 'NestedBoard' }).expect(201)
    const boardId = boardRes.body.id

    const list = await prisma.list.create({ data: { name: 'L', position: 0, boardId } })
    const card = await prisma.card.create({ data: { title: 'Nc', position: 0, listId: list.id } })
    await prisma.comment.create({ data: { content: 'c1', cardId: card.id, userId: reg.body.id } })
    const label = await prisma.label.create({ data: { name: 'important', color: 'red' } })
    await prisma.cardLabel.create({ data: { cardId: card.id, labelId: label.id } })

    const res = await request(app).get(`/boards/${boardId}`).set('Authorization', `Bearer ${token}`).expect(200)
    expect(res.body.lists).toBeDefined()
    expect(Array.isArray(res.body.lists)).toBe(true)
    const l = res.body.lists.find((x: any) => x.id === list.id)
    expect(l).toBeTruthy()
    expect(Array.isArray(l.cards)).toBe(true)
    const c = l.cards.find((x: any) => x.id === card.id)
    expect(c).toBeTruthy()
    expect(Array.isArray(c.comments)).toBe(true)
    expect(Array.isArray(c.labels)).toBe(true)
  })
})
