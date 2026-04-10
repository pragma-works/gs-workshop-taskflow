import { z, ZodType } from 'zod'
import { ValidationError } from './errors'

const positiveInt = z.coerce.number().int().positive()

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'request'
      return `${path}: ${issue.message}`
    })
    .join('; ')
}

export function parseWithSchema<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw new ValidationError(formatZodError(result.error))
  }

  return result.data
}

export const idParamSchema = z.object({
  id: positiveInt,
})

export const createBoardSchema = z.object({
  name: z.string().trim().min(1).max(120),
})

export const addBoardMemberSchema = z.object({
  memberId: positiveInt,
})

export const registerUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(120),
})

export const loginUserSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(128),
})

export const createCardSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  listId: positiveInt,
  assigneeId: positiveInt.optional(),
})

export const moveCardSchema = z.object({
  targetListId: positiveInt,
  position: z.coerce.number().int().min(0),
})

export const addCommentSchema = z.object({
  content: z.string().trim().min(1).max(4000),
})