import { z } from 'zod'

export const createCardSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  listId: z.number().int().positive('listId must be a positive integer'),
  assigneeId: z.number().int().positive().optional(),
})

export const moveCardSchema = z.object({
  targetListId: z.number().int().positive('targetListId must be a positive integer'),
  position: z.number().int().min(0, 'position must be >= 0'),
})

export const addCommentSchema = z.object({
  content: z.string().min(1, 'Content is required'),
})
