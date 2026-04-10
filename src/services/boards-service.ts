import {
  addBoardMember,
  createBoard,
  findBoardDetails,
  isBoardMember,
  isBoardOwner,
  listBoardsByUserId,
} from '../repositories/board-repository'
import { AppError } from '../errors/app-error'
import { requireString } from './http-input'

export async function getBoardsForUser(userId: number) {
  return listBoardsByUserId(userId)
}

export async function getBoardForUser(userId: number, boardId: number) {
  const member = await isBoardMember(userId, boardId)
  if (!member) {
    throw new AppError('Not a board member', 403)
  }

  const board = await findBoardDetails(boardId)
  if (!board) {
    throw new AppError('Board not found', 404)
  }

  const lists = board.lists.map(list => ({
    ...list,
    cards: list.cards.map(card => ({
      ...card,
      labels: card.labels.map(labelJoin => labelJoin.label),
    })),
  }))

  return {
    ...board,
    lists,
  }
}

export async function createBoardForUser(userId: number, input: { name: unknown }) {
  const name = requireString(input.name, 'name')

  const board = await createBoard(name)
  await addBoardMember(userId, board.id, 'owner')
  return board
}

export async function addMemberToBoard(userId: number, boardId: number, input: { memberId: unknown }) {
  const owner = await isBoardOwner(userId, boardId)
  if (!owner) {
    throw new AppError('Only board owners can add members', 403)
  }

  const memberId = Number.parseInt(String(input.memberId), 10)
  if (Number.isNaN(memberId)) {
    throw new AppError('memberId must be a number', 400)
  }

  await addBoardMember(memberId, boardId, 'member')
  return { ok: true }
}
