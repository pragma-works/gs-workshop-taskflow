// ─── Event Types ──────────────────────────────────────────────────────────────

export enum EventType {
  CARD_MOVED = 'card_moved',
}

// ─── DTOs (Data Transfer Objects) ─────────────────────────────────────────────

export interface CreateCardDto {
  title: string
  description?: string
  listId: number
  assigneeId?: number
}

export interface MoveCardDto {
  targetListId: number
  position: number
}

export interface AddCommentDto {
  content: string
}

export interface CreateBoardDto {
  name: string
}

export interface AddMemberDto {
  memberId: number
}

export interface RegisterDto {
  email: string
  password: string
  name: string
}

export interface LoginDto {
  email: string
  password: string
}

export interface PaginationQuery {
  page?: number
  limit?: number
}

// ─── Error Hierarchy ──────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    public override readonly message: string,
    public readonly statusCode: number
  ) {
    super(message)
    this.name = this.constructor.name
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409)
  }
}
