import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'

import { createAuthToken, createTestContext, type TestContext } from '../support/test-context'

async function createBoardFixture(testContext: TestContext) {
  const user = await testContext.prisma.user.create({
    data: {
      email: 'member@test.com',
      password: 'hashed-password',
      name: 'Member',
    },
  })

  const board = await testContext.prisma.board.create({
    data: { name: 'Board' },
  })

  await testContext.prisma.boardMember.create({
    data: {
      boardId: board.id,
      userId: user.id,
      role: 'owner',
    },
  })

  const sourceList = await testContext.prisma.list.create({
    data: {
      boardId: board.id,
      name: 'Backlog',
      position: 0,
    },
  })

  const targetList = await testContext.prisma.list.create({
    data: {
      boardId: board.id,
      name: 'Done',
      position: 1,
    },
  })

  const card = await testContext.prisma.card.create({
    data: {
      title: 'Ship activity feed',
      position: 0,
      listId: sourceList.id,
    },
  })

  return {
    user,
    board,
    sourceList,
    targetList,
    card,
    authToken: createAuthToken(user.id),
  }
}

describe('board activity feed', () => {
  let testContext: TestContext | undefined

  afterEach(async () => {
    if (testContext) {
      await testContext.cleanup()
      testContext = undefined
    }
  })

  it('returns 401 when an unauthenticated caller requests board activity', async () => {
    testContext = await createTestContext('activity-auth')

    const response = await request(testContext.app).get('/boards/1/activity')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'Unauthorized' })
  })

  it('returns a card_moved event in preview when a board member moves a card', async () => {
    testContext = await createTestContext('activity-preview-move')
    const { authToken, board, card, sourceList, targetList, user } = await createBoardFixture(testContext)

    const moveResponse = await request(testContext.app)
      .patch(`/cards/${card.id}/move`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        targetListId: targetList.id,
        position: 0,
      })

    expect(moveResponse.status).toBe(200)

    const previewResponse = await request(testContext.app).get(`/boards/${board.id}/activity/preview`)

    expect(previewResponse.status).toBe(200)
    expect(previewResponse.body).toEqual({
      events: [
        expect.objectContaining({
          boardId: board.id,
          cardId: card.id,
          userId: user.id,
          action: 'card_moved',
          meta: expect.objectContaining({
            fromListId: sourceList.id,
            toListId: targetList.id,
          }),
        }),
      ],
    })
  })

  it('returns 403 when an authenticated non-member requests board activity', async () => {
    testContext = await createTestContext('activity-member-check')

    const user = await testContext.prisma.user.create({
      data: {
        email: 'outsider@test.com',
        password: 'hashed-password',
        name: 'Outsider',
      },
    })

    const board = await testContext.prisma.board.create({
      data: { name: 'Private Board' },
    })

    const response = await request(testContext.app)
      .get(`/boards/${board.id}/activity`)
      .set('Authorization', `Bearer ${createAuthToken(user.id)}`)

    expect(response.status).toBe(403)
    expect(response.body).toEqual({ error: 'Not a board member' })
  })

  it('returns newest-first preview events when a member comments after moving a card', async () => {
    testContext = await createTestContext('activity-preview-order')
    const { authToken, board, card, targetList } = await createBoardFixture(testContext)

    const moveResponse = await request(testContext.app)
      .patch(`/cards/${card.id}/move`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        targetListId: targetList.id,
        position: 0,
      })

    expect(moveResponse.status).toBe(200)

    const commentResponse = await request(testContext.app)
      .post(`/cards/${card.id}/comments`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        content: 'This is ready for review',
      })

    expect(commentResponse.status).toBe(201)

    const previewResponse = await request(testContext.app).get(`/boards/${board.id}/activity/preview`)

    expect(previewResponse.status).toBe(200)
    expect(previewResponse.body.events).toHaveLength(2)
    expect(previewResponse.body.events.map((event: { action: string }) => event.action)).toEqual([
      'comment_added',
      'card_moved',
    ])
  })

  it('returns 404 and does not create preview activity when the target list does not exist', async () => {
    testContext = await createTestContext('activity-missing-target-list')
    const { authToken, board, card } = await createBoardFixture(testContext)

    const moveResponse = await request(testContext.app)
      .patch(`/cards/${card.id}/move`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        targetListId: 999999,
        position: 0,
      })

    expect(moveResponse.status).toBe(404)
    expect(moveResponse.body).toEqual({ error: 'Target list not found' })

    const previewResponse = await request(testContext.app).get(`/boards/${board.id}/activity/preview`)

    expect(previewResponse.status).toBe(200)
    expect(previewResponse.body).toEqual({ events: [] })
  })
})
