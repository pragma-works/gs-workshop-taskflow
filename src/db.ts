import { PrismaClient } from '@prisma/client'

/** Creates a Prisma client instance for application wiring. */
export function createPrismaClient(): PrismaClient {
  return new PrismaClient()
}
