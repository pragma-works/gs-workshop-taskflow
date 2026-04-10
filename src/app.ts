import express from 'express'
import { resolve } from 'node:path'
import type { TokenService } from './auth/token-service'
import { authenticateRequest } from './middleware/authenticate-request'
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
  const authenticatedRoute = authenticateRequest(services.tokenService)
  const publicDirectory = resolve(__dirname, '..', 'public')
  app.use(express.json())
  app.use(express.static(publicDirectory))

  app.use('/users', createUsersRouter(services.usersService))
  app.use('/boards', createActivityRouter(services.activityService, authenticatedRoute))
  app.use('/boards', createBoardsRouter(services.boardsService, authenticatedRoute))
  app.use('/cards', createCardsRouter(services.cardsService, authenticatedRoute))

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
