import type { ApplicationServices } from '../app'
import { TokenService } from '../auth/token-service'
import { createPrismaClient } from '../db'
import { ActivityService } from '../services/activity-service'
import { BoardsService } from '../services/boards-service'
import { CardsService } from '../services/cards-service'
import { UsersService } from '../services/users-service'
import { PrismaActivityRepository } from './prisma-activity-repository'
import { PrismaBoardRepository } from './prisma-board-repository'
import { PrismaCardRepository } from './prisma-card-repository'
import { PrismaUserRepository } from './prisma-user-repository'

/** Builds the application dependency graph. */
export function createApplicationServices(jwtSecret: string): ApplicationServices {
  const databaseClient = createPrismaClient()
  const userRepository = new PrismaUserRepository(databaseClient)
  const boardRepository = new PrismaBoardRepository(databaseClient)
  const cardRepository = new PrismaCardRepository(databaseClient)
  const activityRepository = new PrismaActivityRepository(databaseClient)
  const tokenService = new TokenService(jwtSecret)

  return {
    activityService: new ActivityService(boardRepository, activityRepository),
    boardsService: new BoardsService(boardRepository, userRepository),
    cardsService: new CardsService(cardRepository),
    tokenService,
    usersService: new UsersService(userRepository, tokenService),
  }
}
