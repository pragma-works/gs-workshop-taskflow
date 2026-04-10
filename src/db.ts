import { PrismaClient } from '@prisma/client'

// Ensure a default DATABASE_URL for local tests/dev if not set
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./dev.db'

// ANTI-PATTERN: global singleton — no connection lifecycle management
const prisma = new PrismaClient()

export default prisma
