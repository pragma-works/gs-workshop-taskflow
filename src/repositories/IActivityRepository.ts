export interface ActivityFeedEvent {
  id: number
  boardId: number
  actorId: number
  eventType: string
  cardId: number | null
  fromListId: number | null
  toListId: number | null
  createdAt: Date
  actorName: string
  cardTitle: string | null
  fromListName: string | null
  toListName: string | null
}

export interface IActivityRepository {
  findByBoard(boardId: number): Promise<ActivityFeedEvent[]>
}
