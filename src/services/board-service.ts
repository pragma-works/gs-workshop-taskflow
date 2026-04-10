import { ForbiddenError, NotFoundError } from '../errors'
import { boardRepository, BoardRepository } from '../repositories/board-repository'

type BoardServiceDependencies = {
  boardRepository: BoardRepository
}

const defaultDependencies: BoardServiceDependencies = {
  boardRepository,
}

export async function assertBoardMember(
  userId: number,
  boardId: number,
  dependencies: BoardServiceDependencies = defaultDependencies
): Promise<void> {
  const membership = await dependencies.boardRepository.findMembership(userId, boardId)

  if (!membership) {
    throw new ForbiddenError('Not a board member')
  }
}

export async function assertBoardOwner(
  userId: number,
  boardId: number,
  dependencies: BoardServiceDependencies = defaultDependencies
): Promise<void> {
  const membership = await dependencies.boardRepository.findMembership(userId, boardId)

  if (!membership || membership.role !== 'owner') {
    throw new ForbiddenError('Only board owners can add members')
  }
}

export async function listBoardsForUser(
  userId: number,
  dependencies: BoardServiceDependencies = defaultDependencies
) {
  const memberships = await dependencies.boardRepository.findBoardsForUser(userId)

  return memberships.map((membership) => membership.board)
}

export async function getBoardDetailsForUser(
  userId: number,
  boardId: number,
  dependencies: BoardServiceDependencies = defaultDependencies
) {
  await assertBoardMember(userId, boardId, dependencies)

  const board = await dependencies.boardRepository.findBoardDetails(boardId)

  if (!board) {
    throw new NotFoundError('Board not found')
  }

  return {
    id: board.id,
    name: board.name,
    createdAt: board.createdAt,
    lists: board.lists.map((list) => ({
      id: list.id,
      name: list.name,
      position: list.position,
      boardId: list.boardId,
      cards: list.cards.map((card) => ({
        id: card.id,
        title: card.title,
        description: card.description,
        position: card.position,
        dueDate: card.dueDate,
        listId: card.listId,
        assigneeId: card.assigneeId,
        createdAt: card.createdAt,
        comments: card.comments,
        labels: card.labels.map((cardLabel) => cardLabel.label),
      })),
    })),
  }
}

export async function createBoardForUser(
  userId: number,
  name: string,
  dependencies: BoardServiceDependencies = defaultDependencies
) {
  return dependencies.boardRepository.createBoardWithOwner(userId, name)
}

export async function addMemberToBoard(
  ownerId: number,
  boardId: number,
  memberId: number,
  dependencies: BoardServiceDependencies = defaultDependencies
) {
  await assertBoardOwner(ownerId, boardId, dependencies)
  await dependencies.boardRepository.addMember(boardId, memberId)
}