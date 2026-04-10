import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
let shutdownHooksRegistered = false

export async function connectDatabase() {
  await prisma.$connect()
}

export async function disconnectDatabase() {
  await prisma.$disconnect()
}

export function registerDatabaseShutdownHooks() {
  if (shutdownHooksRegistered) {
    return
  }

  shutdownHooksRegistered = true

  const shutdown = async () => {
    await disconnectDatabase()
    process.exit(0)
  }

  process.once('SIGINT', () => {
    void shutdown()
  })

  process.once('SIGTERM', () => {
    void shutdown()
  })
}

export default prisma
