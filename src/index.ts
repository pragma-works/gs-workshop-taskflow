import { TokenService } from './auth/token-service'
import { createApp } from './app'
import { loadEnvironment } from './config/environment'
import { createPrismaClient } from './db'
import { PrismaActivityRepository } from './repositories/prisma-activity-repository'
import { PrismaBoardRepository } from './repositories/prisma-board-repository'
import { PrismaCardRepository } from './repositories/prisma-card-repository'
import { PrismaUserRepository } from './repositories/prisma-user-repository'
import { ActivityService } from './services/activity-service'
import { BoardsService } from './services/boards-service'
import { CardsService } from './services/cards-service'
import { UsersService } from './services/users-service'

const environment = loadEnvironment()
const prismaClient = createPrismaClient()

const userRepository = new PrismaUserRepository(prismaClient)
const boardRepository = new PrismaBoardRepository(prismaClient)
const cardRepository = new PrismaCardRepository(prismaClient)
const activityRepository = new PrismaActivityRepository(prismaClient)
const tokenService = new TokenService(environment.jwtSecret)

const usersService = new UsersService(userRepository, tokenService)
const boardsService = new BoardsService(boardRepository, userRepository)
const cardsService = new CardsService(cardRepository)
const activityService = new ActivityService(boardRepository, activityRepository)

const app = createApp({
  activityService,
  boardsService,
  cardsService,
  tokenService,
  usersService,
})

if (require.main === module) {
  app.listen(environment.port, () => {
    console.log(`taskflow running on :${environment.port}`)
  })
}

export default app
