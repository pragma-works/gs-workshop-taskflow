import express, { Request, Response, NextFunction } from 'express'
import path from 'path'
import boardsRouter from './routes/boards'
import cardsRouter  from './routes/cards'
import usersRouter  from './routes/users'
import activityRouter from './routes/activity'

const app = express()
app.use(express.json())

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')))

app.use('/users',  usersRouter)
app.use('/boards', boardsRouter)
app.use('/boards', activityRouter)
app.use('/cards',  cardsRouter)

// API info endpoint (keep for programmatic access)
app.get('/api', (req: Request, res: Response) => {
  res.json({
    name: 'taskflow API',
    version: '1.0.0',
    endpoints: {
      users: '/users',
      boards: '/boards',
      cards: '/cards',
      activity: '/boards/:id/activity'
    },
    status: 'running'
  })
})

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error', details: err.message })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`taskflow running on :${PORT}`))

export default app
