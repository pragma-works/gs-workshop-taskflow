import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../index'
import { createUser, authHeader, createBoard, createList, createCard } from '../test/helpers'

describe('POST /cards', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/cards').send({ title: 'T', listId: 1 })
    expect(res.status).toBe(401)
  })

  it('creates a card and returns 201', async () => {
    const user = await createUser({ email: 'cards-create@example.com' })
    const board = await createBoard(user.id)
    const list = await createList(board.id)
    const res = await request(app)
      .post('/cards')
      .set('Authorization', authHeader(user.id))
      .send({ title: 'New Task', listId: list.id })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ title: 'New Task', listId: list.id })
  })
})

describe('GET /cards/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/cards/1')
    expect(res.status).toBe(401)
  })

  it('returns 404 for non-existent card', async () => {
    const user = await createUser({ email: 'cards-404@example.com' })
    const res = await request(app)
      .get('/cards/99999')
      .set('Authorization', authHeader(user.id))
    expect(res.status).toBe(404)
  })

  it('returns card with comments and labels', async () => {
    const user = await createUser({ email: 'cards-get@example.com' })
    const board = await createBoard(user.id)
    const list = await createList(board.id)
    const card = await createCard(list.id, 'Card A')
    const res = await request(app)
      .get(`/cards/${card.id}`)
      .set('Authorization', authHeader(user.id))
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: card.id, title: 'Card A' })
    expect(res.body.comments).toEqual([])
    expect(res.body.labels).toEqual([])
  })
})

describe('PATCH /cards/:id/move', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).patch('/cards/1/move').send({ targetListId: 1, position: 0 })
    expect(res.status).toBe(401)
  })

  it('returns 404 for non-existent card', async () => {
    const user = await createUser({ email: 'cards-move404@example.com' })
    const res = await request(app)
      .patch('/cards/99999/move')
      .set('Authorization', authHeader(user.id))
      .send({ targetListId: 1, position: 0 })
    expect(res.status).toBe(404)
  })

  it('moves a card to a different list', async () => {
    const user = await createUser({ email: 'cards-move@example.com' })
    const board = await createBoard(user.id)
    const listA = await createList(board.id, 'Backlog', 0)
    const listB = await createList(board.id, 'In Progress', 1)
    const card = await createCard(listA.id)
    const res = await request(app)
      .patch(`/cards/${card.id}/move`)
      .set('Authorization', authHeader(user.id))
      .send({ targetListId: listB.id, position: 0 })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })
})

describe('POST /cards/:id/comments', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/cards/1/comments').send({ content: 'hi' })
    expect(res.status).toBe(401)
  })

  it('adds a comment to the card and returns 201', async () => {
    const user = await createUser({ email: 'cards-comment@example.com' })
    const board = await createBoard(user.id)
    const list = await createList(board.id)
    const card = await createCard(list.id)
    const res = await request(app)
      .post(`/cards/${card.id}/comments`)
      .set('Authorization', authHeader(user.id))
      .send({ content: 'Great work!' })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ content: 'Great work!', cardId: card.id })
  })
})

describe('DELETE /cards/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).delete('/cards/1')
    expect(res.status).toBe(401)
  })

  it('deletes a card and returns ok', async () => {
    const user = await createUser({ email: 'cards-delete@example.com' })
    const board = await createBoard(user.id)
    const list = await createList(board.id)
    const card = await createCard(list.id)
    const res = await request(app)
      .delete(`/cards/${card.id}`)
      .set('Authorization', authHeader(user.id))
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })
})
