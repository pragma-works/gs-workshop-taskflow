import express, { Request, Response, NextFunction } from 'express'
import { initContainer } from './container'
import boardsRouter from './routes/boards'
import cardsRouter  from './routes/cards'
import usersRouter  from './routes/users'
import activityRouter from './routes/activity'
import { AppError } from './types'

initContainer()

const app = express()
app.use(express.json())

app.use('/users',  usersRouter)
app.use('/boards', boardsRouter)
app.use('/cards',  cardsRouter)
app.use('/boards', activityRouter)

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

export default app
