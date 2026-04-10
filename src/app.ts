import express, { type Express } from 'express'

import { createTokenService } from './auth'
import { getAppConfig } from './config'
import { createDatabaseClient } from './db'
import { createErrorHandler } from './http'
import { createActivityRepository } from './repositories/activity-repository'
import { createBoardsRepository } from './repositories/boards-repository'
import { createCardsRepository } from './repositories/cards-repository'
import { createUsersRepository } from './repositories/users-repository'
import { createActivityRouter } from './routes/activity'
import { createBoardsRouter } from './routes/boards'
import { createCardsRouter } from './routes/cards'
import { createUsersRouter } from './routes/users'
import { createActivityService } from './services/activity-service'
import { createBoardsService } from './services/boards-service'
import { createCardsService } from './services/cards-service'
import { createUsersService } from './services/users-service'

export interface AppDependencies {
  readonly databaseClient?: ReturnType<typeof createDatabaseClient>
}

export function createApp(dependencies: AppDependencies = {}): Express {
  const config = getAppConfig()
  const databaseClient = dependencies.databaseClient ?? createDatabaseClient()
  const tokenService = createTokenService(config)

  const usersRepository = createUsersRepository(databaseClient)
  const boardsRepository = createBoardsRepository(databaseClient)
  const cardsRepository = createCardsRepository(databaseClient)
  const activityRepository = createActivityRepository(databaseClient)

  const boardsService = createBoardsService(boardsRepository)
  const usersService = createUsersService(usersRepository, tokenService)
  const cardsService = createCardsService(cardsRepository, boardsService)
  const activityService = createActivityService(boardsRepository, activityRepository)

  const app = express()

  app.use(express.json())
  app.use('/users', createUsersRouter(usersService))
  app.use('/boards', createBoardsRouter(boardsService, tokenService))
  app.use('/boards', createActivityRouter(activityService, tokenService))
  app.use('/cards', createCardsRouter(cardsService, tokenService))
  app.use(createErrorHandler())

  return app
}
