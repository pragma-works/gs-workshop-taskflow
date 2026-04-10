import express from 'express'
import { authService, boardService, cardService, activityService } from './repositories/container'
import { createUsersRouter }    from './routes/users'
import { createBoardsRouter }   from './routes/boards'
import { createCardsRouter }    from './routes/cards'
import { createActivityRouter } from './routes/activity'

const app = express()
app.use(express.json())

app.use('/users',  createUsersRouter(authService))
app.use('/boards', createBoardsRouter(boardService))
app.use('/boards', createActivityRouter(activityService))
app.use('/cards',  createCardsRouter(cardService))

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ error: err.message })
})

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3001
  app.listen(PORT, () => console.log(`taskflow running on :${PORT}`))
}

export default app
