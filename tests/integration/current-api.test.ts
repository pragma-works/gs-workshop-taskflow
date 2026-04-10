import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestApplication, type TestApplication } from '../helpers/test-application'

describe('current API integration', () => {
  let testApplication: TestApplication

  beforeEach(async () => {
    testApplication = await createTestApplication()
  })

  afterEach(async () => {
    await testApplication.cleanup()
  })

  it('registers and fetches users without exposing password hashes', async () => {
    const registerResponse = await request(testApplication.app).post('/users/register').send({
      email: 'newmember@test.com',
      name: 'New Member',
      password: 'password123',
    })

    expect(registerResponse.status).toBe(200)
    expect(registerResponse.body).toMatchObject({
      email: 'newmember@test.com',
      name: 'New Member',
    })
    expect(registerResponse.body.password).toBeUndefined()

    const getUserResponse = await request(testApplication.app).get(
      `/users/${registerResponse.body.id as number}`,
    )

    expect(getUserResponse.status).toBe(200)
    expect(getUserResponse.body.password).toBeUndefined()
  })

  it('logs in seeded users and returns a signed token', async () => {
    const loginResponse = await request(testApplication.app).post('/users/login').send({
      email: 'alice@test.com',
      password: 'password123',
    })

    expect(loginResponse.status).toBe(200)
    expect(typeof loginResponse.body.token).toBe('string')
    expect(loginResponse.body.token.length).toBeGreaterThan(10)
  })

  it('enforces auth, board membership, and owner-only membership changes', async () => {
    const unauthenticatedBoards = await request(testApplication.app).get('/boards')
    expect(unauthenticatedBoards.status).toBe(401)

    const boardsResponse = await request(testApplication.app)
      .get('/boards')
      .set('Authorization', `Bearer ${testApplication.tokens.alice}`)

    expect(boardsResponse.status).toBe(200)
    expect(boardsResponse.body.map((board: { id: number }) => board.id)).toContain(
      testApplication.ids.boardId,
    )

    const boardDetailsResponse = await request(testApplication.app)
      .get(`/boards/${testApplication.ids.boardId}`)
      .set('Authorization', `Bearer ${testApplication.tokens.alice}`)

    expect(boardDetailsResponse.status).toBe(200)
    expect(boardDetailsResponse.body.lists[0].cards[0].comments).toHaveLength(1)
    expect(boardDetailsResponse.body.lists[0].cards[0].labels[0].name).toBe('feature')

    const forbiddenBoardResponse = await request(testApplication.app)
      .get(`/boards/${testApplication.ids.boardId}`)
      .set('Authorization', `Bearer ${testApplication.tokens.outsider}`)

    expect(forbiddenBoardResponse.status).toBe(403)

    const createdBoardResponse = await request(testApplication.app)
      .post('/boards')
      .set('Authorization', `Bearer ${testApplication.tokens.alice}`)
      .send({ name: 'New Board' })

    expect(createdBoardResponse.status).toBe(201)

    const newMemberResponse = await request(testApplication.app).post('/users/register').send({
      email: 'invitee@test.com',
      name: 'Invitee',
      password: 'password123',
    })

    const forbiddenAddResponse = await request(testApplication.app)
      .post(`/boards/${testApplication.ids.boardId}/members`)
      .set('Authorization', `Bearer ${testApplication.tokens.bob}`)
      .send({ memberId: newMemberResponse.body.id as number })

    expect(forbiddenAddResponse.status).toBe(403)

    const addMemberResponse = await request(testApplication.app)
      .post(`/boards/${testApplication.ids.boardId}/members`)
      .set('Authorization', `Bearer ${testApplication.tokens.alice}`)
      .send({ memberId: newMemberResponse.body.id as number })

    expect(addMemberResponse.status).toBe(201)

    const inviteeLoginResponse = await request(testApplication.app).post('/users/login').send({
      email: 'invitee@test.com',
      password: 'password123',
    })

    const inviteeBoardsResponse = await request(testApplication.app)
      .get('/boards')
      .set('Authorization', `Bearer ${inviteeLoginResponse.body.token as string}`)

    expect(inviteeBoardsResponse.status).toBe(200)
    expect(inviteeBoardsResponse.body.map((board: { id: number }) => board.id)).toContain(
      testApplication.ids.boardId,
    )
  })

  it('enforces auth and board scope on card reads and moves', async () => {
    const unauthenticatedCardResponse = await request(testApplication.app).get(
      `/cards/${testApplication.ids.cardId}`,
    )
    expect(unauthenticatedCardResponse.status).toBe(401)

    const cardResponse = await request(testApplication.app)
      .get(`/cards/${testApplication.ids.cardId}`)
      .set('Authorization', `Bearer ${testApplication.tokens.alice}`)

    expect(cardResponse.status).toBe(200)
    expect(cardResponse.body.comments).toHaveLength(1)
    expect(cardResponse.body.labels[0].name).toBe('feature')

    const crossBoardMoveResponse = await request(testApplication.app)
      .patch(`/cards/${testApplication.ids.cardId}/move`)
      .set('Authorization', `Bearer ${testApplication.tokens.alice}`)
      .send({ position: 0, targetListId: testApplication.ids.foreignListId })

    expect(crossBoardMoveResponse.status).toBe(400)

    const moveResponse = await request(testApplication.app)
      .patch(`/cards/${testApplication.ids.cardId}/move`)
      .set('Authorization', `Bearer ${testApplication.tokens.alice}`)
      .send({ position: 0, targetListId: testApplication.ids.inProgressListId })

    expect(moveResponse.status).toBe(200)

    const movedCardResponse = await request(testApplication.app)
      .get(`/cards/${testApplication.ids.cardId}`)
      .set('Authorization', `Bearer ${testApplication.tokens.alice}`)

    expect(movedCardResponse.status).toBe(200)
    expect(movedCardResponse.body.listId).toBe(testApplication.ids.inProgressListId)
  })

  it('creates cards and comments for members and deletes cards safely', async () => {
    const createCardResponse = await request(testApplication.app)
      .post('/cards')
      .set('Authorization', `Bearer ${testApplication.tokens.alice}`)
      .send({
        description: 'Write tests first',
        listId: testApplication.ids.backlogListId,
        title: 'Testing task',
      })

    expect(createCardResponse.status).toBe(201)
    expect(createCardResponse.body.position).toBe(1)

    const outsiderCommentResponse = await request(testApplication.app)
      .post(`/cards/${createCardResponse.body.id as number}/comments`)
      .set('Authorization', `Bearer ${testApplication.tokens.outsider}`)
      .send({ content: 'I should not be here.' })

    expect(outsiderCommentResponse.status).toBe(403)

    const commentResponse = await request(testApplication.app)
      .post(`/cards/${createCardResponse.body.id as number}/comments`)
      .set('Authorization', `Bearer ${testApplication.tokens.alice}`)
      .send({ content: 'Looks good.' })

    expect(commentResponse.status).toBe(201)

    const deleteResponse = await request(testApplication.app)
      .delete(`/cards/${createCardResponse.body.id as number}`)
      .set('Authorization', `Bearer ${testApplication.tokens.alice}`)

    expect(deleteResponse.status).toBe(200)

    const deletedCardResponse = await request(testApplication.app)
      .get(`/cards/${createCardResponse.body.id as number}`)
      .set('Authorization', `Bearer ${testApplication.tokens.alice}`)

    expect(deletedCardResponse.status).toBe(404)
  })
})
