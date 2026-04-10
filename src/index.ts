import express, { Request, Response, NextFunction } from 'express'
import boardsRouter   from './routes/boards'
import cardsRouter    from './routes/cards'
import usersRouter    from './routes/users'
import activityRouter from './routes/activity'

const app = express()
app.use(express.json())

// Root — API info
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'taskflow API',
    version: '1.0.0',
    endpoints: [
      'POST   /users/register',
      'POST   /users/login',
      'GET    /boards',
      'POST   /boards',
      'GET    /boards/:id',
      'GET    /boards/:id/activity',
      'GET    /boards/:id/activity/preview',
      'GET    /cards/:id',
      'POST   /cards',
      'PATCH  /cards/:id/move',
      'POST   /cards/:id/comments',
      'DELETE /cards/:id',
    ],
  })
})

// Chrome DevTools discovery — prevents noisy 404s in browser console
app.get('/.well-known/appspecific/com.chrome.devtools.json', (_req: Request, res: Response) => {
  res.json({ workspace: { root: process.cwd(), uuid: 'taskflow-dev' } })
})

app.use('/users',  usersRouter)
app.use('/boards', boardsRouter)
app.use('/boards', activityRouter)
app.use('/cards',  cardsRouter)

// 404 handler for unmatched routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' })
})

// Global error handler — catches any unhandled throws
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error', details: err.message })
})

const PORT = process.env.PORT || 3001
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`taskflow running on :${PORT}`))
}

export default app
