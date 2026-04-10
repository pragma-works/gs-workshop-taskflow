// ─── Entity row types (returned by repositories) ─────────────────────────────

export interface CardRow {
  id:       number
  title:    string
  listId:   number
  position: number
  list:     { id: number; name: string; boardId: number }
}

export interface CreatedCardRow {
  id:          number
  title:        string
  description:  string | null
  position:     number
  listId:       number
  assigneeId:   number | null
  createdAt:    Date
}

export interface ListRow {
  id:      number
  name:    string
  boardId: number
}

export interface CommentRow {
  id:        number
  content:   string
  cardId:    number
  userId:    number
  createdAt: Date
}

// ─── DTO returned by the API ──────────────────────────────────────────────────

export interface ActivityEventDto {
  id:           number
  boardId:      number
  actorId:      number
  actorName:    string
  eventType:    string
  cardId:       number
  cardTitle:    string
  fromListName: string | null
  toListName:   string | null
  timestamp:    Date
}

// ─── Input types ──────────────────────────────────────────────────────────────

export interface CreateActivityEventInput {
  boardId:      number
  cardId:       number
  userId:       number
  eventType:    string
  cardTitle:    string
  fromListName?: string | null
  toListName?:  string | null
}

/** Used when creating a card+event atomically: cardId is not yet known. */
export type CreateActivityEventForNewCard = Omit<CreateActivityEventInput, 'cardId'>

export interface CreateCardInput {
  title:        string
  description?: string | null
  listId:       number
  assigneeId?:  number | null
  position:     number
}

export interface MoveCardInput {
  cardId:        number
  targetListId:  number
  position:      number
  activityEvent: CreateActivityEventInput
}

export interface CreateCommentInput {
  content: string
  cardId:  number
  userId:  number
}

// ─── Repository interfaces ────────────────────────────────────────────────────

export interface IActivityRepository {
  listForBoard(boardId: number): Promise<ActivityEventDto[]>
}

export interface ICardRepository {
  findById(id: number): Promise<CardRow | null>
  countInList(listId: number): Promise<number>
  /** Creates card and activity event in a single atomic transaction. */
  createWithEvent(
    cardData:  CreateCardInput,
    eventData: CreateActivityEventForNewCard,
  ): Promise<CreatedCardRow>
  /** Updates card.listId and creates a card_moved event atomically. */
  moveWithEvent(input: MoveCardInput): Promise<void>
}

export interface IListRepository {
  findById(id: number): Promise<ListRow | null>
}

export interface IBoardMemberRepository {
  isMember(userId: number, boardId: number): Promise<boolean>
}

export interface ICommentRepository {
  /** Creates comment and activity event in a single atomic transaction. */
  createWithEvent(
    data:      CreateCommentInput,
    eventData: CreateActivityEventInput,
  ): Promise<CommentRow>
}
