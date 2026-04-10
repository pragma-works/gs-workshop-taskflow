export interface UserRecord {
  readonly createdAt: Date
  readonly email: string
  readonly id: number
  readonly name: string
  readonly password: string
}

export interface BoardRecord {
  readonly createdAt: Date
  readonly id: number
  readonly name: string
}

export interface ListRecord {
  readonly boardId: number
  readonly id: number
  readonly name: string
  readonly position: number
}

export interface LabelRecord {
  readonly color: string
  readonly id: number
  readonly name: string
}

export interface CommentRecord {
  readonly cardId: number
  readonly content: string
  readonly createdAt: Date
  readonly id: number
  readonly userId: number
}

export interface CardRecord {
  readonly assigneeId: number | null
  readonly createdAt: Date
  readonly description: string | null
  readonly dueDate: Date | null
  readonly id: number
  readonly listId: number
  readonly position: number
  readonly title: string
}

export interface CardWithBoardRecord extends CardRecord {
  readonly list: Pick<ListRecord, 'boardId' | 'id'>
}

export interface CardDetailsRecord extends CardRecord {
  readonly comments: readonly CommentRecord[]
  readonly labels: readonly LabelRecord[]
}

export interface BoardListRecord extends ListRecord {
  readonly cards: readonly CardDetailsRecord[]
}

export interface BoardDetailsRecord extends BoardRecord {
  readonly lists: readonly BoardListRecord[]
}
