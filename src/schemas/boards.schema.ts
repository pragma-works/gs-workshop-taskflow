import { z } from 'zod'

export const createBoardSchema = z.object({
  name: z.string().min(1, 'Board name is required'),
})

export const addMemberSchema = z.object({
  memberId: z.number().int().positive('memberId must be a positive integer'),
})
