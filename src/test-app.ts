import express from 'express'
import boardsRouter from './routes/boards'
import cardsRouter from './routes/cards'
import usersRouter from './routes/users'
import activityRouter from './routes/activity'
import { PrismaClient } from '@prisma/client'

/**
 * Creates an Express app instance with a custom Prisma client (for testing)
 */
export function createApp(prisma: PrismaClient) {
  const app = express()
  app.use(express.json())

  // Override the prisma import with test instance
  // We'll do this by injecting prisma into route handlers via middleware
  app.use((req: any, res, next) => {
    req.prisma = prisma
    next()
  })

  app.use('/users', usersRouter)
  app.use('/boards', boardsRouter)
  app.use('/boards', activityRouter)
  app.use('/cards', cardsRouter)

  return app
}
