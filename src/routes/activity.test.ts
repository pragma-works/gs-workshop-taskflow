import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type supertest from 'supertest'

const JWT_SECRET = 'super-secret-key-change-me'

type User = {
  id: number
  email: string
  password: string
  name: string
  createdAt: Date
}

type Board = {
  id: number
  name: string
  createdAt: Date
}

type BoardMember = {
  userId: number
  boardId: number
  role: string
}

type List = {
  id: number
  name: string
  position: number
  boardId: number
}

type Card = {
  id: number
  title: string
  description: string | null
  position: number
  dueDate: Date | null
  listId: number
  assigneeId: number | null
  createdAt: Date
}

type Comment = {
  id: number
  content: string
  cardId: number
  userId: number
  createdAt: Date
}

type ActivityEvent = {
  id: number
  boardId: number
  actorId: number
  eventType: string
  cardId: number | null
  fromListId: number | null
  toListId: number | null
  createdAt: Date
}

type Store = {
  users: User[]
  boards: Board[]
  boardMembers: BoardMember[]
  lists: List[]
  cards: Card[]
  comments: Comment[]
  activityEvents: ActivityEvent[]
  nextUserId: number
  nextBoardId: number
  nextListId: number
  nextCardId: number
  nextCommentId: number
  nextEventId: number
}

const store: Store = {
  users: [],
  boards: [],
  boardMembers: [],
  lists: [],
  cards: [],
  comments: [],
  activityEvents: [],
  nextUserId: 1,
  nextBoardId: 1,
  nextListId: 1,
  nextCardId: 1,
  nextCommentId: 1,
  nextEventId: 1,
}

let app: import('express').Express
let jwt: typeof import('jsonwebtoken')
let request: typeof supertest

function resetStore() {
  store.users = []
  store.boards = []
  store.boardMembers = []
  store.lists = []
  store.cards = []
  store.comments = []
  store.activityEvents = []
  store.nextUserId = 1
  store.nextBoardId = 1
  store.nextListId = 1
  store.nextCardId = 1
  store.nextCommentId = 1
  store.nextEventId = 1
}

function createToken(userId: number) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}

function createUser(data: { email: string; password: string; name: string }): User {
  const user = {
    id: store.nextUserId++,
    email: data.email,
    password: data.password,
    name: data.name,
    createdAt: new Date(),
  }
  store.users.push(user)
  return user
}

function createBoard(data: { name: string }): Board {
  const board = { id: store.nextBoardId++, name: data.name, createdAt: new Date() }
  store.boards.push(board)
  return board
}

function createList(data: { name: string; position: number; boardId: number }): List {
  const list = { id: store.nextListId++, ...data }
  store.lists.push(list)
  return list
}

function createCard(data: {
  title: string
  description?: string | null
  position: number
  listId: number
  assigneeId?: number | null
}): Card {
  const card = {
    id: store.nextCardId++,
    title: data.title,
    description: data.description ?? null,
    position: data.position,
    dueDate: null,
    listId: data.listId,
    assigneeId: data.assigneeId ?? null,
    createdAt: new Date(),
  }
  store.cards.push(card)
  return card
}

function createActivityEvent(data: {
  boardId: number
  actorId: number
  eventType: string
  cardId?: number | null
  fromListId?: number | null
  toListId?: number | null
  createdAt?: Date
}): ActivityEvent {
  const event = {
    id: store.nextEventId++,
    boardId: data.boardId,
    actorId: data.actorId,
    eventType: data.eventType,
    cardId: data.cardId ?? null,
    fromListId: data.fromListId ?? null,
    toListId: data.toListId ?? null,
    createdAt: data.createdAt ?? new Date(),
  }
  store.activityEvents.push(event)
  return event
}

function formatEvent(event: ActivityEvent) {
  const actor = store.users.find((user) => user.id === event.actorId)
  const card = store.cards.find((item) => item.id === event.cardId)
  const fromList = store.lists.find((list) => list.id === event.fromListId)
  const toList = store.lists.find((list) => list.id === event.toListId)

  return {
    ...event,
    actorName: actor?.name,
    cardTitle: card?.title ?? null,
    fromListName: fromList?.name ?? null,
    toListName: toList?.name ?? null,
  }
}

const repository = {
  createUser: async (data: { email: string; password: string; name: string }) => createUser(data),
  findUserByEmail: async (email: string) => store.users.find((user) => user.email === email) ?? null,
  findUserById: async (id: number) => store.users.find((user) => user.id === id) ?? null,
  listBoardsForUser: async (userId: number) =>
    store.boardMembers
      .filter((membership) => membership.userId === userId)
      .map((membership) => store.boards.find((board) => board.id === membership.boardId))
      .filter(Boolean),
  isBoardMember: async (userId: number, boardId: number) =>
    store.boardMembers.some(
      (membership) => membership.userId === userId && membership.boardId === boardId,
    ),
  getBoardWithDetails: async (boardId: number) => {
    const board = store.boards.find((item) => item.id === boardId)
    if (!board) return null

    return {
      ...board,
      lists: store.lists
        .filter((list) => list.boardId === boardId)
        .sort((left, right) => left.position - right.position)
        .map((list) => ({
          ...list,
          cards: store.cards
            .filter((card) => card.listId === list.id)
            .sort((left, right) => left.position - right.position)
            .map((card) => ({
              ...card,
              comments: store.comments.filter((comment) => comment.cardId === card.id),
              labels: [],
            })),
        })),
    }
  },
  createBoardWithOwner: async (userId: number, name: string) => {
    const board = createBoard({ name })
    store.boardMembers.push({ userId, boardId: board.id, role: 'owner' })
    return board
  },
  addBoardMember: async (boardId: number, memberId: number) => {
    const membership = { userId: memberId, boardId, role: 'member' }
    store.boardMembers.push(membership)
    return membership
  },
  getCardWithDetails: async (cardId: number) => {
    const card = store.cards.find((item) => item.id === cardId)
    if (!card) return null

    return {
      ...card,
      comments: store.comments.filter((comment) => comment.cardId === card.id),
      labels: [],
    }
  },
  createCard: async (data: {
    title: string
    description?: string
    listId: number
    assigneeId?: number
  }) => {
    const position = store.cards.filter((card) => card.listId === data.listId).length
    return createCard({ ...data, position })
  },
  findCardById: async (cardId: number) => store.cards.find((card) => card.id === cardId) ?? null,
  moveCardWithActivity: async (data: {
    cardId: number
    actorId: number
    fromListId: number
    targetListId: number
    position: number
  }) => {
    const card = store.cards.find((item) => item.id === data.cardId)
    const targetList = store.lists.find((list) => list.id === data.targetListId)

    if (!card) throw new Error('Card not found')
    if (!targetList) throw new Error('Target list not found')

    card.listId = data.targetListId
    card.position = data.position
    return createActivityEvent({
      boardId: targetList.boardId,
      actorId: data.actorId,
      eventType: 'card_moved',
      cardId: data.cardId,
      fromListId: data.fromListId,
      toListId: data.targetListId,
    })
  },
  createComment: async (data: { content: string; cardId: number; userId: number }) => {
    const comment = { id: store.nextCommentId++, createdAt: new Date(), ...data }
    store.comments.push(comment)
    return comment
  },
  deleteCard: async (cardId: number) => {
    const card = store.cards.find((item) => item.id === cardId)
    if (!card) throw new Error('Card not found')
    store.cards = store.cards.filter((item) => item.id !== cardId)
    return card
  },
  getActivityEvents: async (boardId: number) =>
    store.activityEvents
      .filter((event) => event.boardId === boardId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map(formatEvent),
}

async function createBoardFixture() {
  const actor = createUser({
    email: `ada-${Date.now()}-${Math.random()}@example.com`,
    password: 'hashed-password',
    name: 'Ada Lovelace',
  })
  const member = createUser({
    email: `grace-${Date.now()}-${Math.random()}@example.com`,
    password: 'hashed-password',
    name: 'Grace Hopper',
  })
  const board = createBoard({ name: 'Launch Plan' })
  store.boardMembers.push({ userId: actor.id, boardId: board.id, role: 'owner' })
  const fromList = createList({ name: 'Todo', position: 0, boardId: board.id })
  const toList = createList({ name: 'Done', position: 1, boardId: board.id })
  const card = createCard({ title: 'Write activity feed', position: 0, listId: fromList.id })
  const token = createToken(actor.id)

  return { actor, member, board, fromList, toList, card, token }
}

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET
  vi.doMock('../repositories/taskflow', () => repository)

  const [expressModule, supertestModule, jwtModule, usersModule, boardsModule, cardsModule, activityModule] =
    await Promise.all([
      import('express'),
      import('supertest'),
      import('jsonwebtoken'),
      import('./users'),
      import('./boards'),
      import('./cards'),
      import('./activity'),
    ])

  jwt = jwtModule
  request = supertestModule.default

  app = expressModule.default()
  app.use(expressModule.default.json())
  app.use('/users', usersModule.default)
  app.use('/boards', boardsModule.default)
  app.use('/boards', activityModule.default)
  app.use('/cards', cardsModule.default)
})

beforeEach(() => {
  resetStore()
})

describe('activity feed routes', () => {
  it('requires authentication before returning board activity', async () => {
    const response = await request(app).get('/boards/1/activity')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'Unauthorized' })
  })

  it('moves a card and records the activity event atomically', async () => {
    const { actor, board, fromList, toList, card, token } = await createBoardFixture()

    const response = await request(app)
      .patch(`/cards/${card.id}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send({ targetListId: toList.id, position: 3 })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      ok: true,
      event: {
        boardId: board.id,
        actorId: actor.id,
        eventType: 'card_moved',
        cardId: card.id,
        fromListId: fromList.id,
        toListId: toList.id,
      },
    })

    expect(card).toMatchObject({ listId: toList.id, position: 3 })
    expect(store.activityEvents).toHaveLength(1)
    expect(store.activityEvents[0]).toMatchObject({
      boardId: board.id,
      actorId: actor.id,
      eventType: 'card_moved',
      cardId: card.id,
      fromListId: fromList.id,
      toListId: toList.id,
    })
  })

  it('returns preview events newest first with denormalized display names', async () => {
    const { actor, board, fromList, toList, card } = await createBoardFixture()

    createActivityEvent({
      boardId: board.id,
      actorId: actor.id,
      eventType: 'card_moved',
      cardId: card.id,
      fromListId: fromList.id,
      toListId: toList.id,
      createdAt: new Date('2024-01-01T10:00:00.000Z'),
    })
    createActivityEvent({
      boardId: board.id,
      actorId: actor.id,
      eventType: 'card_moved',
      cardId: card.id,
      fromListId: toList.id,
      toListId: fromList.id,
      createdAt: new Date('2024-01-01T11:00:00.000Z'),
    })

    const response = await request(app).get(`/boards/${board.id}/activity/preview`)

    expect(response.status).toBe(200)
    expect(response.body).toHaveLength(2)
    expect(response.body.map((event: { createdAt: string }) => event.createdAt)).toEqual([
      '2024-01-01T11:00:00.000Z',
      '2024-01-01T10:00:00.000Z',
    ])
    expect(response.body[0]).toMatchObject({
      actorName: 'Ada Lovelace',
      cardTitle: 'Write activity feed',
      fromListName: 'Done',
      toListName: 'Todo',
    })
    expect(response.body[1]).toMatchObject({
      actorName: 'Ada Lovelace',
      cardTitle: 'Write activity feed',
      fromListName: 'Todo',
      toListName: 'Done',
    })
  })

  it('rolls back a failed move to a missing list without creating activity', async () => {
    const { card, fromList, token } = await createBoardFixture()

    const response = await request(app)
      .patch(`/cards/${card.id}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send({ targetListId: 999_999, position: 2 })

    expect(response.status).toBe(500)
    expect(response.body.error).toBe('Move failed')
    expect(card).toMatchObject({ listId: fromList.id, position: 0 })
    expect(store.activityEvents).toHaveLength(0)
  })

  it('returns authenticated board activity for board members', async () => {
    const { actor, board, fromList, toList, card, token } = await createBoardFixture()
    createActivityEvent({
      boardId: board.id,
      actorId: actor.id,
      eventType: 'card_moved',
      cardId: card.id,
      fromListId: fromList.id,
      toListId: toList.id,
    })

    const response = await request(app)
      .get(`/boards/${board.id}/activity`)
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body[0]).toMatchObject({
      actorName: 'Ada Lovelace',
      cardTitle: 'Write activity feed',
      fromListName: 'Todo',
      toListName: 'Done',
    })
  })

  it('rejects authenticated board activity for non-members', async () => {
    const { board } = await createBoardFixture()
    const outsider = createUser({
      email: 'outside@example.com',
      password: 'hashed-password',
      name: 'Outside User',
    })

    const response = await request(app)
      .get(`/boards/${board.id}/activity`)
      .set('Authorization', `Bearer ${createToken(outsider.id)}`)

    expect(response.status).toBe(403)
    expect(response.body).toEqual({ error: 'Not a board member' })
  })
})

describe('users routes', () => {
  it('registers users with a hashed password', async () => {
    const response = await request(app)
      .post('/users/register')
      .send({ email: 'ada@example.com', password: 'secret', name: 'Ada Lovelace' })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ email: 'ada@example.com', name: 'Ada Lovelace' })
    expect(response.body.password).not.toBe('secret')
  })

  it('issues a token for valid credentials', async () => {
    await request(app)
      .post('/users/register')
      .send({ email: 'ada@example.com', password: 'secret', name: 'Ada Lovelace' })

    const response = await request(app)
      .post('/users/login')
      .send({ email: 'ada@example.com', password: 'secret' })

    expect(response.status).toBe(200)
    expect(response.body.token).toEqual(expect.any(String))
  })

  it('rejects invalid credentials', async () => {
    const missingUser = await request(app)
      .post('/users/login')
      .send({ email: 'missing@example.com', password: 'secret' })

    await request(app)
      .post('/users/register')
      .send({ email: 'ada@example.com', password: 'secret', name: 'Ada Lovelace' })
    const badPassword = await request(app)
      .post('/users/login')
      .send({ email: 'ada@example.com', password: 'wrong' })

    expect(missingUser.status).toBe(401)
    expect(badPassword.status).toBe(401)
  })

  it('returns users by id or a not found response', async () => {
    const created = await request(app)
      .post('/users/register')
      .send({ email: 'ada@example.com', password: 'secret', name: 'Ada Lovelace' })

    const found = await request(app).get(`/users/${created.body.id}`)
    const missing = await request(app).get('/users/9999')

    expect(found.status).toBe(200)
    expect(found.body.name).toBe('Ada Lovelace')
    expect(missing.status).toBe(404)
  })
})

describe('boards routes', () => {
  it('lists and creates boards for authenticated users', async () => {
    const { actor, board, token } = await createBoardFixture()

    const listed = await request(app).get('/boards').set('Authorization', `Bearer ${token}`)
    const created = await request(app)
      .post('/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Board' })

    expect(listed.status).toBe(200)
    expect(listed.body).toMatchObject([{ id: board.id, name: board.name }])
    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({ name: 'New Board' })
    expect(store.boardMembers).toContainEqual({
      userId: actor.id,
      boardId: created.body.id,
      role: 'owner',
    })
  })

  it('requires authentication before listing boards', async () => {
    const response = await request(app).get('/boards')

    expect(response.status).toBe(401)
  })

  it('returns full board details to members', async () => {
    const { board, token } = await createBoardFixture()

    const response = await request(app)
      .get(`/boards/${board.id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      id: board.id,
      lists: [{ name: 'Todo', cards: [{ title: 'Write activity feed' }] }, { name: 'Done' }],
    })
  })

  it('rejects full board details for non-members before board lookup', async () => {
    const { board } = await createBoardFixture()
    const outsider = createUser({
      email: 'outsider@example.com',
      password: 'hashed-password',
      name: 'Outsider',
    })

    const response = await request(app)
      .get(`/boards/${board.id}`)
      .set('Authorization', `Bearer ${createToken(outsider.id)}`)

    expect(response.status).toBe(403)
  })

  it('returns not found for a missing board after membership passes', async () => {
    const { actor } = await createBoardFixture()
    store.boardMembers.push({ userId: actor.id, boardId: 9999, role: 'member' })

    const response = await request(app)
      .get('/boards/9999')
      .set('Authorization', `Bearer ${createToken(actor.id)}`)

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'Board not found' })
  })

  it('adds board members for authenticated callers', async () => {
    const { board, member, token } = await createBoardFixture()

    const response = await request(app)
      .post(`/boards/${board.id}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ memberId: member.id })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ ok: true })
    expect(store.boardMembers).toContainEqual({
      userId: member.id,
      boardId: board.id,
      role: 'member',
    })
  })
})

describe('cards routes', () => {
  it('returns cards with comments and labels', async () => {
    const { card, actor, token } = await createBoardFixture()
    store.comments.push({
      id: store.nextCommentId++,
      content: 'Looks good',
      cardId: card.id,
      userId: actor.id,
      createdAt: new Date(),
    })

    const response = await request(app).get(`/cards/${card.id}`).set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      title: 'Write activity feed',
      comments: [{ content: 'Looks good' }],
      labels: [],
    })
  })

  it('returns not found for missing cards', async () => {
    const { token } = await createBoardFixture()

    const response = await request(app).get('/cards/9999').set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(404)
  })

  it('creates cards at the next position in the list', async () => {
    const { fromList, token } = await createBoardFixture()

    const response = await request(app)
      .post('/cards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Second card', description: 'Details', listId: fromList.id })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({
      title: 'Second card',
      description: 'Details',
      listId: fromList.id,
      position: 1,
    })
  })

  it('adds comments to cards as the authenticated user', async () => {
    const { actor, card, token } = await createBoardFixture()

    const response = await request(app)
      .post(`/cards/${card.id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Done' })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ content: 'Done', cardId: card.id, userId: actor.id })
  })

  it('deletes cards for authenticated callers', async () => {
    const { card, token } = await createBoardFixture()

    const response = await request(app)
      .delete(`/cards/${card.id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ok: true })
    expect(store.cards).not.toContainEqual(expect.objectContaining({ id: card.id }))
  })

  it('requires authentication before changing cards', async () => {
    const { card } = await createBoardFixture()

    const createResponse = await request(app).post('/cards').send({ title: 'Nope', listId: 1 })
    const moveResponse = await request(app)
      .patch(`/cards/${card.id}/move`)
      .send({ targetListId: 1, position: 0 })
    const commentResponse = await request(app)
      .post(`/cards/${card.id}/comments`)
      .send({ content: 'Nope' })
    const deleteResponse = await request(app).delete(`/cards/${card.id}`)

    expect(createResponse.status).toBe(401)
    expect(moveResponse.status).toBe(401)
    expect(commentResponse.status).toBe(401)
    expect(deleteResponse.status).toBe(401)
  })
})
