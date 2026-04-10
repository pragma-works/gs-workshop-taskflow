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
  eventType:    string   // EventType enum value serialised to string in JSON
  cardId:       number
  cardTitle:    string
  fromListName: string | null
  toListName:   string | null
  timestamp:    Date
}

// ─── Input / command types ────────────────────────────────────────────────────

export interface CreateActivityEventInput {
  boardId:      number
  cardId:       number
  userId:       number
  eventType:    string   // accepts EventType enum value
  cardTitle:    string
  fromListName?: string | null
  toListName?:  string | null
}

export interface CreateCardInput {
  title:        string
  description?: string | null
  listId:       number
  assigneeId?:  number | null
  position:     number
}

export interface UpdateCardInput {
  listId:   number
  position: number
}

export interface CreateCommentInput {
  content: string
  cardId:  number
  userId:  number
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationOptions {
  /** Number of events to return. Capped at 100 by the application layer. */
  limit:  number
  /** Zero-based offset for cursor-less pagination. */
  offset: number
}

// ─── Repository interfaces ────────────────────────────────────────────────────
// Services depend on these — never on concrete Prisma types.

export interface IActivityRepository {
  listForBoard(boardId: number, options: PaginationOptions): Promise<ActivityEventDto[]>
  create(data: CreateActivityEventInput): Promise<void>
}

export interface ICardRepository {
  findById(id: number): Promise<CardRow | null>
  countInList(listId: number): Promise<number>
  create(data: CreateCardInput): Promise<CreatedCardRow>
  update(id: number, data: UpdateCardInput): Promise<void>
}

export interface IListRepository {
  findById(id: number): Promise<ListRow | null>
}

export interface IBoardMemberRepository {
  isMember(userId: number, boardId: number): Promise<boolean>
}

export interface ICommentRepository {
  create(data: CreateCommentInput): Promise<CommentRow>
}
