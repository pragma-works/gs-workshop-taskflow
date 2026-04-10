// ─── Entity row types ─────────────────────────────────────────────────────────

export interface CardRow {
  id:       number
  title:    string
  listId:   number
  position: number
  list:     { id: number; name: string; boardId: number }
}

export interface CardWithAssigneeRow {
  id:          number
  title:        string
  listId:       number
  position:     number
  description:  string | null
  assigneeId:   number | null
  createdAt:    Date
  assignee:     { id: number; name: string; email: string } | null
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
  id:       number
  name:     string
  boardId:  number
  position: number
}

export interface LabelRow {
  id:    number
  name:  string
  color: string
}

export interface CommentRow {
  id:        number
  content:   string
  cardId:    number
  userId:    number
  createdAt: Date
}

export interface BoardRow {
  id:        number
  name:      string
  createdAt: Date
}

export interface CardDetailRow {
  id:          number
  title:        string
  listId:       number
  position:     number
  description:  string | null
  assigneeId:   number | null
  createdAt:    Date
  comments:     CommentRow[]
  labels:       LabelRow[]
}

export interface ListWithCardsRow extends ListRow {
  cards: CardDetailRow[]
}

export interface BoardWithDetailsRow extends BoardRow {
  lists: ListWithCardsRow[]
}

export interface BoardMemberRow {
  boardId: number
  userId:  number
  role:    string
}

export interface PublicUserRow {
  id:        number
  email:     string
  name:      string
  createdAt: Date
}

export interface AuthUserRow extends PublicUserRow {
  password: string
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

// ─── Input / command types ────────────────────────────────────────────────────

export interface CreateActivityEventInput {
  boardId:      number
  cardId:       number
  userId:       number
  eventType:    string
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

export interface CreateUserInput {
  email:    string
  password: string
  name:     string
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationOptions {
  limit:  number
  offset: number
}

// ─── Repository interfaces ────────────────────────────────────────────────────

export interface IActivityRepository {
  listForBoard(boardId: number, options: PaginationOptions): Promise<ActivityEventDto[]>
  create(data: CreateActivityEventInput): Promise<void>
}

export interface ICardRepository {
  findById(id: number): Promise<CardRow | null>
  findByIdWithAssignee(id: number): Promise<CardWithAssigneeRow | null>
  countInList(listId: number): Promise<number>
  create(data: CreateCardInput): Promise<CreatedCardRow>
  update(id: number, data: UpdateCardInput): Promise<void>
  delete(id: number): Promise<void>
}

export interface IListRepository {
  findById(id: number): Promise<ListRow | null>
}

export interface IBoardRepository {
  findById(id: number): Promise<BoardRow | null>
  findByIdWithDetails(id: number): Promise<BoardWithDetailsRow | null>
  findByUserId(userId: number): Promise<BoardRow[]>
  create(name: string): Promise<BoardRow>
}

export interface IBoardMemberRepository {
  isMember(userId: number, boardId: number): Promise<boolean>
  addMember(userId: number, boardId: number, role: string): Promise<void>
}

export interface ICommentRepository {
  create(data: CreateCommentInput): Promise<CommentRow>
}

export interface IUserRepository {
  findById(id: number): Promise<PublicUserRow | null>
  findByEmail(email: string): Promise<AuthUserRow | null>
  create(data: CreateUserInput): Promise<PublicUserRow>
}
