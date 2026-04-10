import express, { Request, Response, NextFunction } from 'express'
import boardsRouter   from './routes/boards'
import cardsRouter    from './routes/cards'
import usersRouter    from './routes/users'
import activityRouter from './routes/activity'

const app = express()
app.use(express.json())

app.use('/users',  usersRouter)
app.use('/boards', boardsRouter)
app.use('/boards', activityRouter)
app.use('/cards',  cardsRouter)

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 3001
if (!process.env.VITEST) {
  app.listen(PORT, () => console.log(`taskflow running on :${PORT}`))
}

export default app
