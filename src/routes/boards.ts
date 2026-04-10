import { Prisma } from '@prisma/client'
import { Router } from 'express'
import { getUserId, requireAuth } from '../auth'
import prisma from '../db'
import { AppError, asyncHandler } from '../errors'
import { getBoardAccess, requireBoardMember, requireBoardOwner } from '../permissions'
import { publicUserSelect, toActivityResponse } from '../serializers'
import { parsePositiveInt, requireString } from '../validation'

const router = Router()
router.use(requireAuth)

type TransactionClient = Prisma.TransactionClient

router.get('/', asyncHandler(async (req, res) => {
  const userId = getUserId(req)
  const boards = await prisma.board.findMany({
    where: { members: { some: { userId } } },
    orderBy: { createdAt: 'desc' },
    include: {
      members: {
        where: { userId },
        select: { role: true },
      },
    },
  })

  const response = []
  for (const board of boards) {
    response.push({
      id: board.id,
      name: board.name,
      createdAt: board.createdAt,
      role: board.members[0]?.role ?? 'member',
    })
  }

  res.json(response)
}))

router.get('/:id/activity', asyncHandler(async (req, res) => {
  const boardId = parsePositiveInt(req.params.id, 'board id')
  const userId = getUserId(req)
  await requireBoardMember(userId, boardId)

  const events = await prisma.activityEvent.findMany({
    where: { boardId },
    orderBy: { createdAt: 'desc' },
  })

  res.json(events.map(toActivityResponse))
}))

router.get('/:id', asyncHandler(async (req, res) => {
  const userId = getUserId(req)
  const boardId = parsePositiveInt(req.params.id, 'board id')
  await requireBoardMember(userId, boardId)

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      members: {
        include: {
          user: {
            select: publicUserSelect,
          },
        },
      },
      lists: {
        orderBy: { position: 'asc' },
        include: {
          cards: {
            orderBy: { position: 'asc' },
            include: {
              assignee: { select: publicUserSelect },
              comments: {
                orderBy: { createdAt: 'asc' },
                include: {
                  user: { select: publicUserSelect },
                },
              },
              labels: {
                include: {
                  label: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!board) {
    throw new AppError(404, 'Board not found')
  }

  const members = []
  for (const member of board.members) {
    members.push({ role: member.role, user: member.user })
  }

  const lists = []
  for (const list of board.lists) {
    const cards = []
    for (const card of list.cards) {
      const labels = []
      for (const labelLink of card.labels) {
        labels.push(labelLink.label)
      }

      cards.push({
        id: card.id,
        title: card.title,
        description: card.description,
        position: card.position,
        dueDate: card.dueDate,
        listId: card.listId,
        assigneeId: card.assigneeId,
        createdAt: card.createdAt,
        assignee: card.assignee,
        comments: card.comments,
        labels,
      })
    }

    lists.push({
      id: list.id,
      name: list.name,
      position: list.position,
      boardId: list.boardId,
      cards,
    })
  }

  res.json({
    id: board.id,
    name: board.name,
    createdAt: board.createdAt,
    members,
    lists,
  })
}))

router.post('/', asyncHandler(async (req, res) => {
  const userId = getUserId(req)
  const name = requireString(req.body.name, 'name', { minLength: 1, maxLength: 120 })

  const board = await prisma.$transaction(async (tx: TransactionClient) => {
    const createdBoard = await tx.board.create({ data: { name } })
    await tx.boardMember.create({ data: { userId, boardId: createdBoard.id, role: 'owner' } })
    return createdBoard
  })

  res.status(201).json(board)
}))

router.post('/:id/members', asyncHandler(async (req, res) => {
  const currentUserId = getUserId(req)
  const boardId = parsePositiveInt(req.params.id, 'board id')
  const memberId = parsePositiveInt(req.body.memberId, 'member id')

  await requireBoardOwner(currentUserId, boardId)

  const user = await prisma.user.findUnique({ where: { id: memberId }, select: { id: true } })
  if (!user) {
    throw new AppError(404, 'User not found')
  }

  const existingMembership = await getBoardAccess(memberId, boardId)
  if (existingMembership) {
    throw new AppError(409, 'User is already a board member')
  }

  const membership = await prisma.boardMember.create({
    data: { userId: memberId, boardId, role: 'member' },
  })

  res.status(201).json(membership)
}))

export default router
