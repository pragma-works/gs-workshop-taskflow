/**
 * Unit of Work abstraction.
 *
 * Services depend on this interface, not on any ORM API.
 * The concrete implementation (PrismaUnitOfWork) wraps prisma.$transaction.
 * Swap the implementation to change the persistence technology without
 * touching any service or use-case code.
 */
import type { IActivityRepository, ICardRepository, ICommentRepository } from './types'

export interface UnitOfWorkRepos {
  cards:      ICardRepository
  activities: IActivityRepository
  comments:   ICommentRepository
}

export interface IUnitOfWork {
  /** Run `work` inside a single atomic transaction. */
  run<T>(work: (repos: UnitOfWorkRepos) => Promise<T>): Promise<T>
}
