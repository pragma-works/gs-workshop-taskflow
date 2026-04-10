import express, { type NextFunction, type Request, type Response } from 'express'

import { HttpError, getErrorMessage } from './lib/errors'
import activityRouter from './routes/activity'
import boardsRouter from './routes/boards'
import cardsRouter  from './routes/cards'
import usersRouter  from './routes/users'

const app = express()
app.use(express.json())

app.use('/users',  usersRouter)
app.use('/boards', activityRouter)
app.use('/boards', boardsRouter)
app.use('/cards',  cardsRouter)

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof HttpError) {
    if (error.details) {
      res.status(error.status).json({ error: error.message, details: error.details })
      return
    }

    res.status(error.status).json({ error: error.message })
    return
  }

  res.status(500).json({
    error: 'Internal server error',
    details: getErrorMessage(error),
  })
})

const PORT = process.env.PORT || 3001
if (require.main === module && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`taskflow running on :${PORT}`))
}

export default app
