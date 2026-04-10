import { Request } from 'express'

export interface AuthRequest extends Request {
  userId?: number
}

export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, message)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message)
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(400, message)
  }
}

/* ── Repository Interfaces ────────────────────────────────── */

export interface IUserRepository {
  findByEmail(email: string): Promise<any>
  findById(id: number): Promise<any>
  create(data: { email: string; password: string; name: string }): Promise<any>
}

export interface IBoardRepository {
  findBoardsByUserId(userId: number): Promise<any[]>
  findById(boardId: number): Promise<any>
  findWithDetails(boardId: number): Promise<any>
  checkMembership(userId: number, boardId: number): Promise<boolean>
  getMemberRole(userId: number, boardId: number): Promise<string | null>
  create(name: string, ownerId: number): Promise<any>
  addMember(boardId: number, memberId: number): Promise<void>
}

export interface ICardRepository {
  findById(id: number): Promise<any>
  findByIdWithDetails(id: number): Promise<any>
  findByIdWithList(id: number): Promise<any>
  create(data: { title: string; description?: string; listId: number; assigneeId?: number }): Promise<any>
  updateListAndPosition(cardId: number, listId: number, position: number): Promise<any>
  delete(id: number): Promise<void>
  countByList(listId: number): Promise<number>
  createComment(data: { content: string; cardId: number; userId: number }): Promise<any>
  moveCardWithEvent(cardId: number, targetListId: number, position: number, userId: number): Promise<{ card: any; event: any }>
  addCommentWithEvent(cardId: number, content: string, userId: number): Promise<{ comment: any; event: any }>
}

export interface IActivityRepository {
  create(data: { boardId: number; cardId?: number; userId: number; action: string; meta?: string }): Promise<any>
  findByBoardId(boardId: number, limit?: number): Promise<any[]>
}

/* ── Service Interfaces ───────────────────────────────────── */

export interface IUserService {
  register(email: string, password: string, name: string): Promise<any>
  login(email: string, password: string): Promise<{ token: string }>
  getById(id: number): Promise<any>
}

export interface IBoardService {
  listForUser(userId: number): Promise<any[]>
  getWithDetails(userId: number, boardId: number): Promise<any>
  create(name: string, ownerId: number): Promise<any>
  addMember(userId: number, boardId: number, memberId: number): Promise<void>
}

export interface ICardService {
  getById(id: number): Promise<any>
  create(data: { title: string; description?: string; listId: number; assigneeId?: number }): Promise<any>
  moveCard(userId: number, cardId: number, targetListId: number, position: number): Promise<{ card: any; event: any }>
  addComment(userId: number, cardId: number, content: string): Promise<{ comment: any; event: any }>
  delete(cardId: number): Promise<void>
}

export interface IActivityService {
  getByBoard(userId: number, boardId: number): Promise<any[]>
  getPreview(boardId: number): Promise<any[]>
}
