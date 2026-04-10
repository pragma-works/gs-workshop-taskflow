import type {
  Board,
  Card,
  Comment,
  CardLabel,
  Label,
  User,
  ActivityEvent,
  List,
} from '@prisma/client'
import type { PaginationQuery } from '../types'

// ─── Domain Types ─────────────────────────────────────────────────────────────

export type SafeUser = Omit<User, 'password'>

export type CardWithDetails = Card & {
  comments: Comment[]
  labels: (CardLabel & { label: Label })[]
}

export type BoardWithLists = Board & {
  lists: (List & {
    cards: CardWithDetails[]
  })[]
}

export type ActivityEventFormatted = ActivityEvent & {
  actor: { name: string }
  card: { title: string } | null
  fromList: { name: string } | null
  toList: { name: string } | null
}

export type MoveCardResult = {
  card: Card
  event: ActivityEvent
}

// ─── Repository Interfaces ────────────────────────────────────────────────────

export interface IBoardRepository {
  findByUserId(userId: number): Promise<Board[]>
  findWithLists(id: number): Promise<BoardWithLists | null>
  isMember(userId: number, boardId: number): Promise<boolean>
  create(name: string, userId: number): Promise<Board>
  addMember(boardId: number, memberId: number): Promise<void>
}

export interface ICardRepository {
  findWithDetails(id: number): Promise<CardWithDetails | null>
  create(data: {
    title: string
    description?: string
    listId: number
    assigneeId?: number
  }): Promise<Card>
  moveWithActivity(
    cardId: number,
    targetListId: number,
    position: number,
    actorId: number
  ): Promise<MoveCardResult | null>
  addComment(data: {
    content: string
    cardId: number
    userId: number
  }): Promise<Comment>
  delete(id: number): Promise<void>
}

export interface IUserRepository {
  create(data: { email: string; password: string; name: string }): Promise<SafeUser>
  findByEmail(email: string): Promise<User | null>
  findById(id: number): Promise<SafeUser | null>
}

export interface IActivityRepository {
  getByBoard(
    boardId: number,
    pagination?: PaginationQuery
  ): Promise<ActivityEventFormatted[]>
}

// ─── Provider Interfaces ──────────────────────────────────────────────────────

export interface IPasswordHasher {
  hash(plain: string): Promise<string>
  compare(plain: string, hashed: string): Promise<boolean>
}

export interface ITokenProvider {
  sign(payload: object): string
  verify(token: string): { userId: number }
}
