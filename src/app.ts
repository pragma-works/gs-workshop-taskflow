import express, { type Express } from 'express'
import * as bcrypt from 'bcryptjs'
import { signAuthToken } from './auth/jwt'
import databaseClient from './db'
import { createActivityRepository } from './repositories/activity-repository'
import { createBoardRepository } from './repositories/board-repository'
import { createCardRepository } from './repositories/card-repository'
import { createUserRepository } from './repositories/user-repository'
import { createActivityRouter } from './routes/activity'
import { createBoardsRouter } from './routes/boards'
import { createCardsRouter } from './routes/cards'
import { createUsersRouter } from './routes/users'
import { createActivityService } from './services/activity-service'
import { createBoardService } from './services/board-service'
import { createCardService } from './services/card-service'
import { createUserService } from './services/user-service'

/**
 * Builds the Express application and registers all HTTP routes.
 *
 * @returns {Express} Configured application instance.
 */
export function createApp(): Express {
  const userRepository = createUserRepository(databaseClient)
  const boardRepository = createBoardRepository(databaseClient)
  const cardRepository = createCardRepository(databaseClient)
  const activityRepository = createActivityRepository(databaseClient)

  const userService = createUserService({
    userRepository,
    passwordManager: {
      hashPassword: (password: string) => bcrypt.hash(password, 10),
      comparePassword: (password: string, hashedPassword: string) =>
        bcrypt.compare(password, hashedPassword),
    },
    tokenIssuer: {
      issueToken: signAuthToken,
    },
  })
  const boardService = createBoardService({ boardRepository })
  const cardService = createCardService({ boardRepository, cardRepository })
  const activityService = createActivityService({ activityRepository, boardRepository })

  const app = express()
  app.use(express.json())

  app.use('/users', createUsersRouter({ userService }))
  app.use('/boards', createActivityRouter({ activityService }))
  app.use('/boards', createBoardsRouter({ boardService }))
  app.use('/cards', createCardsRouter({ cardService }))

  return app
}
