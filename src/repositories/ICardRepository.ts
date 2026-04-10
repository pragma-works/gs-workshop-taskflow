import { Card, Comment } from '@prisma/client'

export interface CardWithList extends Card {
  list: { boardId: number }
}

export interface MoveResult {
  id: number
  boardId: number
  actorId: number
  eventType: string
  cardId: number | null
  fromListId: number | null
  toListId: number | null
  createdAt: Date
}

export interface ICardRepository {
  findById(id: number): Promise<CardWithList | null>
  create(data: { title: string; description?: string; listId: number; assigneeId?: number }): Promise<Card>
  moveWithActivity(
    cardId: number,
    targetListId: number,
    position: number,
    actorId: number,
    boardId: number,
    fromListId: number,
  ): Promise<MoveResult>
  addComment(cardId: number, userId: number, content: string): Promise<Comment>
  delete(id: number): Promise<void>
}
