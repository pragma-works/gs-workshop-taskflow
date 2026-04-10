import express, { Request, Response, NextFunction } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import boardsRouter   from './routes/boards'
import cardsRouter    from './routes/cards'
import usersRouter    from './routes/users'
import activityRouter from './routes/activity'
import prisma from './db'

const app = express()
app.use(helmet())
app.use(cors())
app.use(express.json({ limit: '10kb' }))

app.use('/users',  usersRouter)
app.use('/boards', boardsRouter)
app.use('/boards', activityRouter)
app.use('/cards',  cardsRouter)

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 3001

// Don't bind a port when imported by the test runner
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => console.log(`taskflow running on :${PORT}`))

  const shutdown = async () => {
    server.close()
    await prisma.$disconnect()
    process.exit(0)
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT',  shutdown)
}

export default app
