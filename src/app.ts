import express, { Request, Response, NextFunction } from 'express'
import boardsRouter from './routes/boards'
import cardsRouter  from './routes/cards'
import usersRouter  from './routes/users'

const app = express()
app.use(express.json())

app.use('/users',  usersRouter)
app.use('/boards', boardsRouter)
app.use('/cards',  cardsRouter)

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.message)
  res.status(500).json({ error: 'Internal server error' })
})

export default app
