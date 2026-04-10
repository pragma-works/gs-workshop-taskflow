import type { PrismaClient } from '@prisma/client'
import type { ApplicationServices } from '../app'
import { TokenService } from '../auth/token-service'
import { createPrismaClient } from '../db'
import { ActivityService } from '../services/activity-service'
import { BoardAccessService } from '../services/board-access-service'
import { BoardsService } from '../services/boards-service'
import { CardsService } from '../services/cards-service'
import { UsersService } from '../services/users-service'
import { PrismaActivityRepository } from './prisma-activity-repository'
import { PrismaBoardRepository } from './prisma-board-repository'
import { PrismaCardRepository } from './prisma-card-repository'
import { PrismaUserRepository } from './prisma-user-repository'

/** Builds the application dependency graph. */
export function createApplicationServices(jwtSecret: string): ApplicationServices {
  return createApplicationServicesFromDatabase(createPrismaClient(), jwtSecret)
}

/** Builds the application dependency graph from an existing database client. */
export function createApplicationServicesFromDatabase(
  databaseClient: PrismaClient,
  jwtSecret: string,
): ApplicationServices {
  const userRepository = new PrismaUserRepository(databaseClient)
  const boardRepository = new PrismaBoardRepository(databaseClient)
  const cardRepository = new PrismaCardRepository(databaseClient)
  const activityRepository = new PrismaActivityRepository(databaseClient)
  const boardAccessService = new BoardAccessService(boardRepository)
  const tokenService = new TokenService(jwtSecret)

  return {
    activityService: new ActivityService(
      boardAccessService,
      activityRepository,
      activityRepository,
    ),
    boardsService: new BoardsService(
      boardRepository,
      boardRepository,
      userRepository,
      boardAccessService,
    ),
    cardsService: new CardsService(cardRepository, boardAccessService),
    tokenService,
    usersService: new UsersService(userRepository, tokenService),
  }
}
