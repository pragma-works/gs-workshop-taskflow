import * as boardRepo from '../repositories/board.repository'

export async function listBoards(userId: number) {
  return boardRepo.findBoardsByUserId(userId)
}

export async function getBoard(boardId: number, userId: number) {
  const membership = await boardRepo.findMembership(userId, boardId)
  if (!membership) {
    throw Object.assign(new Error('Not a board member'), { status: 403 })
  }

  const board = await boardRepo.findBoardWithDetails(boardId)
  if (!board) {
    throw Object.assign(new Error('Board not found'), { status: 404 })
  }

  return board
}

export async function createBoard(name: string, userId: number) {
  const board = await boardRepo.createBoard(name)
  await boardRepo.createMembership(userId, board.id, 'owner')
  return board
}

export async function addMember(boardId: number, memberId: number) {
  await boardRepo.createMembership(memberId, boardId, 'member')
}
