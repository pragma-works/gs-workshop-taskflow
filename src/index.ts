import express, { Request, Response, NextFunction } from 'express'
import boardsRouter from './routes/boards'
import cardsRouter  from './routes/cards'
import usersRouter  from './routes/users'
import activityRouter from './routes/activity'
import { AppError } from './types'

const app = express()
app.use(express.json())

app.use('/users',  usersRouter)
app.use('/boards', boardsRouter)
app.use('/boards', activityRouter)
app.use('/cards',  cardsRouter)

// Global error handler — maps AppError hierarchy to HTTP status codes
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }
  console.error(err)
  res.status(500).json({ error: 'Internal server error', details: err.message })
})

const PORT = process.env.PORT || 3001
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`taskflow running on :${PORT}`))
}

export default app
