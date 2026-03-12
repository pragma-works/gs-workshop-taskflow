import { PrismaClient } from '@prisma/client'

// ANTI-PATTERN: global singleton — no connection lifecycle management
const prisma = new PrismaClient()

export default prisma
