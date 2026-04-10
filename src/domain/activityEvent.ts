/**
 * Domain layer — innermost ring; no imports from infrastructure or application.
 *
 * ActivityEvent is the canonical representation used by the application layer.
 * The EventType enum is the single source of truth for valid event strings.
 */

export enum EventType {
  CardCreated   = 'card_created',
  CardMoved     = 'card_moved',
  CardCommented = 'card_commented',
}

export interface ActivityEvent {
  id:           number
  boardId:      number
  actorId:      number
  actorName:    string
  eventType:    EventType
  cardId:       number
  cardTitle:    string
  fromListName: string | null
  toListName:   string | null
  timestamp:    Date
}
