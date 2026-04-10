import express from 'express'
import type { TokenService } from './auth/token-service'
import { createActivityRouter } from './routes/activity'
import { errorHandler, notFoundHandler } from './routes/error-handler'
import { createBoardsRouter } from './routes/boards'
import { createCardsRouter } from './routes/cards'
import { createUsersRouter } from './routes/users'
import type { ActivityService } from './services/activity-service'
import type { BoardsService } from './services/boards-service'
import type { CardsService } from './services/cards-service'
import type { UsersService } from './services/users-service'

export interface ApplicationServices {
  readonly activityService: ActivityService
  readonly boardsService: BoardsService
  readonly cardsService: CardsService
  readonly tokenService: TokenService
  readonly usersService: UsersService
}

/** Creates the Express application with all routes and middleware. */
export function createApp(services: ApplicationServices) {
  const app = express()
  app.use(express.json())

  app.use('/users', createUsersRouter(services.usersService))
  app.use('/boards', createActivityRouter(services.activityService, services.tokenService))
  app.use('/boards', createBoardsRouter(services.boardsService, services.tokenService))
  app.use('/cards', createCardsRouter(services.cardsService, services.tokenService))

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
