import express, { NextFunction, Request, Response } from 'express'
import boardsRouter   from './routes/boards'
import cardsRouter    from './routes/cards'
import usersRouter    from './routes/users'
import activityRouter from './routes/activity'
import { AppError } from './errors'

const app = express()
app.use(express.json())

app.use('/users',               usersRouter)
app.use('/boards',              boardsRouter)
app.use('/boards/:id/activity', activityRouter)
app.use('/cards',               cardsRouter)

// Global error handler — maps AppError subclasses to their HTTP status codes;
// everything else is an unexpected 500.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 3001
if (require.main === module) {
  app.listen(PORT, () => console.log(`taskflow running on :${PORT}`))
}

export default app
