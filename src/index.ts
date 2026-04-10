import express, { Request, Response, NextFunction } from 'express'
import path from 'path'
import boardsRouter   from './routes/boards'
import cardsRouter    from './routes/cards'
import usersRouter    from './routes/users'
import activityRouter from './routes/activity'

const app = express()
app.use(express.json())

app.use(express.static(path.join(__dirname, '..', 'public')))

app.use('/users',  usersRouter)
app.use('/boards', boardsRouter)
app.use('/boards', activityRouter)
app.use('/cards',  cardsRouter)

// Global error handler — catches unhandled throws from all async route handlers
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', err.message)
  res.status(500).json({ error: 'Internal server error', details: err.message })
})

// Wrap async routes so Express forwards thrown errors to the handler above
const wrapAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)

export { wrapAsync }

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`taskflow running on :${PORT}`))

export default app
