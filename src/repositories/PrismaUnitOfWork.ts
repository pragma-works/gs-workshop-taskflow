import prisma from '../db'
import type { IUnitOfWork, UnitOfWorkRepos } from './IUnitOfWork'
import { PrismaActivityRepository } from './PrismaActivityRepository'
import { PrismaCardRepository } from './PrismaCardRepository'
import { PrismaCommentRepository } from './PrismaCommentRepository'

/**
 * Prisma implementation of the Unit of Work pattern.
 *
 * Wraps prisma.$transaction (interactive form) so that all repo operations
 * passed to `run()` execute against the same transaction client.
 * If any operation throws, Prisma rolls back the entire transaction.
 *
 * Services only depend on IUnitOfWork — they never import prisma directly.
 */
export class PrismaUnitOfWork implements IUnitOfWork {
  async run<T>(work: (repos: UnitOfWorkRepos) => Promise<T>): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return prisma.$transaction(async (tx: any) => {
      return work({
        cards:      new PrismaCardRepository(tx),
        activities: new PrismaActivityRepository(tx),
        comments:   new PrismaCommentRepository(tx),
      })
    })
  }
}
