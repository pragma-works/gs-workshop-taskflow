import express from 'express'
import { PrismaClient } from '@prisma/client'
import boardsRouter   from './routes/boards'
import cardsRouter    from './routes/cards'
import usersRouter    from './routes/users'
import activityRouter from './routes/activity'

/**
 * Creates an Express app instance wired with a custom Prisma client.
 * Used in tests to inject an isolated in-memory database.
 */
export function createApp(prisma: PrismaClient) {
  const app = express()
  app.use(express.json())

  // Inject the test prisma client into every request
  app.use((req: any, _res, next) => {
    req.prisma = prisma
    next()
  })

  app.use('/users',  usersRouter)
  app.use('/boards', boardsRouter)
  app.use('/boards', activityRouter)
  app.use('/cards',  cardsRouter)

  return app
}
