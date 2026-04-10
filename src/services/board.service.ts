import * as boardRepo from '../repositories/board.repository'

export async function assertBoardMember(boardId: number, userId: number) {
  const board = await boardRepo.findBoardById(boardId)
  if (!board) {
    throw Object.assign(new Error('Board not found'), { status: 404 })
  }
  const membership = await boardRepo.findMembership(userId, boardId)
  if (!membership) {
    throw Object.assign(new Error('Not a board member'), { status: 403 })
  }
  return board
}

export async function listBoards(userId: number) {
  return boardRepo.findBoardsByUserId(userId)
}

export async function getBoard(boardId: number, userId: number) {
  await assertBoardMember(boardId, userId)
  return boardRepo.findBoardWithDetails(boardId)
}

export async function createBoard(name: string, userId: number) {
  const board = await boardRepo.createBoard(name)
  await boardRepo.createMembership(userId, board.id, 'owner')
  return board
}

export async function addMember(boardId: number, memberId: number) {
  await boardRepo.createMembership(memberId, boardId, 'member')
}
