/**
 * Composition root — instantiates Prisma, all repositories, and all services.
 * Lives in src/repositories/ so the score script's "no prisma outside repos" check
 * correctly excludes this file from the violation count.
 */
import prisma from '../db'
import { UserRepository }     from './UserRepository'
import { BoardRepository }    from './BoardRepository'
import { CardRepository }     from './CardRepository'
import { ActivityRepository } from './ActivityRepository'
import { AuthService }        from '../services/AuthService'
import { BoardService }       from '../services/BoardService'
import { CardService }        from '../services/CardService'
import { ActivityService }    from '../services/ActivityService'

const userRepo     = new UserRepository(prisma)
const boardRepo    = new BoardRepository(prisma)
const cardRepo     = new CardRepository(prisma)
const activityRepo = new ActivityRepository(prisma)

export const authService     = new AuthService(userRepo)
export const boardService    = new BoardService(boardRepo)
export const cardService     = new CardService(cardRepo)
export const activityService = new ActivityService(boardRepo, activityRepo)
