import { Board, BoardMember } from '@prisma/client'

export interface BoardDetail extends Board {
  lists: ListDetail[]
}

export interface ListDetail {
  id: number
  name: string
  position: number
  boardId: number
  cards: CardDetail[]
}

export interface CardDetail {
  id: number
  title: string
  description: string | null
  position: number
  dueDate: Date | null
  listId: number
  assigneeId: number | null
  createdAt: Date
  comments: { id: number; content: string; userId: number; cardId: number; createdAt: Date }[]
  labels: { id: number; name: string; color: string }[]
}

export interface IBoardRepository {
  findAllForUser(userId: number): Promise<Board[]>
  findById(id: number): Promise<BoardDetail | null>
  create(name: string, ownerUserId: number): Promise<Board>
  addMember(userId: number, boardId: number, role: string): Promise<void>
  getMembership(userId: number, boardId: number): Promise<BoardMember | null>
}
