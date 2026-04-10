import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestApplication, type TestApplication } from '../helpers/test-application'

describe('activity feed integration', () => {
  let testApplication: TestApplication

  beforeEach(async () => {
    testApplication = await createTestApplication()
  })

  afterEach(async () => {
    await testApplication.cleanup()
  })

  it('requires authentication for the full activity feed', async () => {
    const response = await request(testApplication.app).get(
      `/boards/${testApplication.ids.boardId}/activity`,
    )

    expect(response.status).toBe(401)
  })

  it('records card moves atomically and returns events newest first', async () => {
    const moveResponse = await request(testApplication.app)
      .post(`/cards/${testApplication.ids.cardId}/move`)
      .set('Authorization', `Bearer ${testApplication.tokens.alice}`)
      .send({ position: 0, targetListId: testApplication.ids.inProgressListId })

    expect(moveResponse.status).toBe(200)

    const commentResponse = await request(testApplication.app)
      .post(`/cards/${testApplication.ids.cardId}/comments`)
      .set('Authorization', `Bearer ${testApplication.tokens.alice}`)
      .send({ content: 'Move completed.' })

    expect(commentResponse.status).toBe(201)

    const feedResponse = await request(testApplication.app)
      .get(`/boards/${testApplication.ids.boardId}/activity`)
      .set('Authorization', `Bearer ${testApplication.tokens.alice}`)

    expect(feedResponse.status).toBe(200)
    expect(feedResponse.body.events).toHaveLength(2)
    expect(feedResponse.body.events[0]).toMatchObject({
      action: 'comment_added',
      boardId: testApplication.ids.boardId,
      cardId: testApplication.ids.cardId,
    })
    expect(feedResponse.body.events[1]).toMatchObject({
      action: 'card_moved',
      boardId: testApplication.ids.boardId,
      cardId: testApplication.ids.cardId,
    })
  })

  it('returns 403 to non-members and 404 for missing boards', async () => {
    const forbiddenResponse = await request(testApplication.app)
      .get(`/boards/${testApplication.ids.boardId}/activity`)
      .set('Authorization', `Bearer ${testApplication.tokens.outsider}`)

    expect(forbiddenResponse.status).toBe(403)

    const missingResponse = await request(testApplication.app)
      .get('/boards/999999/activity')
      .set('Authorization', `Bearer ${testApplication.tokens.alice}`)

    expect(missingResponse.status).toBe(404)
  })

  it('exposes a public preview limited to the latest ten events', async () => {
    for (let eventIndex = 0; eventIndex < 12; eventIndex += 1) {
      const response = await request(testApplication.app)
        .post(`/cards/${testApplication.ids.cardId}/comments`)
        .set('Authorization', `Bearer ${testApplication.tokens.alice}`)
        .send({ content: `Comment ${eventIndex}` })

      expect(response.status).toBe(201)
    }

    const previewResponse = await request(testApplication.app).get(
      `/boards/${testApplication.ids.boardId}/activity/preview`,
    )

    expect(previewResponse.status).toBe(200)
    expect(previewResponse.body.events).toHaveLength(10)
    expect(previewResponse.body.events[0].action).toBe('comment_added')
    expect(previewResponse.body.events.at(-1).action).toBe('comment_added')
  })
})
