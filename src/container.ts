import {
  IUserRepository,
  IBoardRepository,
  ICardRepository,
  IActivityRepository,
  IUserService,
  IBoardService,
  ICardService,
  IActivityService,
} from './types'
import { userRepository } from './repositories/userRepository'
import { boardRepository } from './repositories/boardRepository'
import { cardRepository } from './repositories/cardRepository'
import { activityRepository } from './repositories/activityRepository'
import { createUserService } from './services/userService'
import { createBoardService } from './services/boardService'
import { createCardService } from './services/cardService'
import { createActivityService } from './services/activityService'

interface Container {
  userRepository: IUserRepository
  boardRepository: IBoardRepository
  cardRepository: ICardRepository
  activityRepository: IActivityRepository
  userService: IUserService
  boardService: IBoardService
  cardService: ICardService
  activityService: IActivityService
}

let instance: Container | null = null

export function getContainer(): Container {
  if (!instance) {
    throw new Error('Container not initialized. Call initContainer() first.')
  }
  return instance
}

export function initContainer(overrides?: Partial<Container>): Container {
  const repos = {
    userRepository: overrides?.userRepository ?? userRepository,
    boardRepository: overrides?.boardRepository ?? boardRepository,
    cardRepository: overrides?.cardRepository ?? cardRepository,
    activityRepository: overrides?.activityRepository ?? activityRepository,
  }

  const services = {
    userService: overrides?.userService ?? createUserService(repos.userRepository),
    boardService: overrides?.boardService ?? createBoardService(repos.boardRepository),
    cardService: overrides?.cardService ?? createCardService(repos.cardRepository, repos.activityRepository),
    activityService: overrides?.activityService ?? createActivityService(repos.activityRepository, repos.boardRepository),
  }

  instance = { ...repos, ...services }
  return instance
}

export function resetContainer(): void {
  instance = null
}
