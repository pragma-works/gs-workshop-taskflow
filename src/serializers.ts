export const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
} as const

type PublicUser = {
  id: number
  email: string
  name: string
  createdAt: Date
}

type ActivityResponseInput = {
  id: number
  boardId: number
  actorId: number
  actorName: string
  eventType: string
  cardId: number
  cardTitle: string
  fromListName: string | null
  toListName: string | null
  commentPreview: string | null
  createdAt: Date
}

export function toPublicUser(user: PublicUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  }
}

export function toActivityResponse(event: ActivityResponseInput) {
  return {
    id: event.id,
    boardId: event.boardId,
    actorId: event.actorId,
    actorName: event.actorName,
    eventType: event.eventType,
    cardId: event.cardId,
    cardTitle: event.cardTitle,
    fromListName: event.fromListName,
    toListName: event.toListName,
    commentPreview: event.commentPreview,
    timestamp: event.createdAt.toISOString(),
  }
}