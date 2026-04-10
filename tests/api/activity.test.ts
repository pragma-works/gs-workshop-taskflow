import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'

import app from '../../src/index'
import { createAuthToken, createTestContext, type TestContext } from '../support/test-context'

describe('board activity feed', () => {
  let testContext: TestContext | undefined

  afterEach(async () => {
    if (testContext) {
      await testContext.cleanup()
      testContext = undefined
    }
  })

  it('returns 401 when an unauthenticated caller requests board activity', async () => {
    const response = await request(app).get('/boards/1/activity')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'Unauthorized' })
  })

  it('returns a card_moved event in preview when a board member moves a card', async () => {
    testContext = await createTestContext('activity-preview-move')

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

    const authToken = createAuthToken(user.id)

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
})
