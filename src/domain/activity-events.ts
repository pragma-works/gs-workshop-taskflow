export const ActivityActionType = {
  CARD_MOVED: 'card_moved',
  COMMENT_ADDED: 'comment_added',
} as const

export type ActivityAction = (typeof ActivityActionType)[keyof typeof ActivityActionType]

export interface CardMovedActivityMeta {
  readonly fromListId: number
  readonly position: number
  readonly toListId: number
}

export interface CommentAddedActivityMeta {
  readonly commentId: number
}

export type ActivityMeta = CardMovedActivityMeta | CommentAddedActivityMeta

export interface ActivityEvent {
  readonly action: ActivityAction
  readonly boardId: number
  readonly cardId?: number
  readonly createdAt: Date
  readonly id: number
  readonly meta?: ActivityMeta
  readonly userId: number
}

export function createCardMovedActivityMeta(
  fromListId: number,
  toListId: number,
  position: number,
): CardMovedActivityMeta {
  return {
    fromListId,
    position,
    toListId,
  }
}

export function createCommentAddedActivityMeta(commentId: number): CommentAddedActivityMeta {
  return { commentId }
}

export function parseActivityAction(action: string): ActivityAction {
  if (action === ActivityActionType.CARD_MOVED || action === ActivityActionType.COMMENT_ADDED) {
    return action
  }

  throw new Error(`Unsupported activity action: ${action}`)
}

export function parseActivityMeta(meta: string | null): ActivityMeta | undefined {
  if (meta === null) {
    return undefined
  }

  const parsedMeta: unknown = JSON.parse(meta)
  if (isCardMovedActivityMeta(parsedMeta) || isCommentAddedActivityMeta(parsedMeta)) {
    return parsedMeta
  }

  throw new Error('Unsupported activity meta payload')
}

export function serializeActivityMeta(meta: ActivityMeta | undefined): string | null {
  return meta === undefined ? null : JSON.stringify(meta)
}

function isCardMovedActivityMeta(value: unknown): value is CardMovedActivityMeta {
  return (
    isObjectRecord(value) &&
    isInteger(value.fromListId) &&
    isInteger(value.toListId) &&
    isInteger(value.position)
  )
}

function isCommentAddedActivityMeta(value: unknown): value is CommentAddedActivityMeta {
  return isObjectRecord(value) && isInteger(value.commentId)
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
}
